import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { MarketService } from '../market/market.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class DcaService {
  constructor(
    private prisma: PrismaService,
    private walletsService: WalletsService,
    private marketService: MarketService,
  ) {}

  async createPlan(userId: string, symbol: string, amount: number, frequency: string) {
    if (amount <= 0) {
      throw new BadRequestException("Le montant doit être supérieur à zéro.");
    }

    const frequencyUpper = frequency.toUpperCase();
    if (!['WEEKLY', 'MONTHLY', 'QUARTERLY'].includes(frequencyUpper)) {
      throw new BadRequestException("Fréquence invalide. Choisir WEEKLY, MONTHLY ou QUARTERLY.");
    }

    // Verify stock exists in market
    const stocks = this.marketService.getStocks();
    const stock = stocks.find(s => s.code === symbol.toUpperCase());
    if (!stock) {
      throw new BadRequestException(`L'action ${symbol} n'existe pas.`);
    }

    // Set first execution run
    const nextRun = new Date();
    if (frequencyUpper === 'WEEKLY') nextRun.setDate(nextRun.getDate() + 7);
    else if (frequencyUpper === 'MONTHLY') nextRun.setMonth(nextRun.getMonth() + 1);
    else nextRun.setMonth(nextRun.getMonth() + 3);

    return this.prisma.dcaPlan.create({
      data: {
        userId,
        symbol: symbol.toUpperCase(),
        amount,
        frequency: frequencyUpper,
        status: 'ACTIVE',
        nextRun,
      },
    });
  }

  async getMyPlans(userId: string) {
    return this.prisma.dcaPlan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async togglePlan(userId: string, planId: string) {
    const plan = await this.prisma.dcaPlan.findFirst({
      where: { id: planId, userId },
    });

    if (!plan) {
      throw new NotFoundException("Plan DCA introuvable.");
    }

    const newStatus = plan.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

    return this.prisma.dcaPlan.update({
      where: { id: planId },
      data: { status: newStatus },
    });
  }

  async deletePlan(userId: string, planId: string) {
    const plan = await this.prisma.dcaPlan.findFirst({
      where: { id: planId, userId },
    });

    if (!plan) {
      throw new NotFoundException("Plan DCA introuvable.");
    }

    await this.prisma.dcaPlan.delete({
      where: { id: planId },
    });

    return { message: "Plan DCA supprimé avec succès." };
  }

  // Cron job executing every day at midnight to process plans
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runActivePlans() {
    console.log('[DCA] Traitement des plans actifs...');
    const now = new Date();

    const activePlans = await this.prisma.dcaPlan.findMany({
      where: {
        status: 'ACTIVE',
        nextRun: {
          lte: now,
        },
      },
    });

    for (const plan of activePlans) {
      try {
        const wallet = await this.walletsService.getCashWallet(plan.userId);
        const stocks = this.marketService.getStocks();
        const stock = stocks.find(s => s.code === plan.symbol);

        if (stock) {
          const qty = Math.floor(plan.amount / stock.price);
          const totalCost = qty * stock.price;

          if (qty > 0 && wallet.balanceAvailable >= totalCost) {
            // Debit cash directly (without freeze since it executes immediately)
            await this.walletsService.debitFrozenCash(plan.userId, totalCost, 0);
            
            // Add securities to user wallet
            await this.walletsService.addSecurities(plan.userId, plan.symbol, qty, stock.price);

            // Log execution in AuditLog
            await this.prisma.auditLog.create({
              data: {
                userId: plan.userId,
                action: 'DCA_EXECUTION',
                details: JSON.stringify({ planId: plan.id, symbol: plan.symbol, quantity: qty, cost: totalCost }),
                ipAddress: '127.0.0.1',
              },
            });
            console.log(`[DCA] Achat automatique de ${qty} x ${plan.symbol} réussi pour l'utilisateur ${plan.userId}`);
          } else {
            console.warn(`[DCA] Solde insuffisant pour exécuter le plan ${plan.id} de l'utilisateur ${plan.userId}`);
          }
        }

        // Set next run date
        const next = new Date();
        if (plan.frequency === 'WEEKLY') next.setDate(next.getDate() + 7);
        else if (plan.frequency === 'MONTHLY') next.setMonth(next.getMonth() + 1);
        else next.setMonth(next.getMonth() + 3);

        await this.prisma.dcaPlan.update({
          where: { id: plan.id },
          data: { nextRun: next },
        });

      } catch (err) {
        console.error(`[DCA] Erreur lors de l'exécution du plan ${plan.id} :`, err.message);
      }
    }
  }
}
