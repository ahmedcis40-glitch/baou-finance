import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletsService {
  constructor(private prisma: PrismaService) {}

  async getCashWallet(userId: string) {
    const wallet = await this.prisma.cashWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException("Portefeuille cash introuvable.");
    }

    const available = wallet.balanceTotal - wallet.balanceFrozen;
    return {
      ...wallet,
      balanceAvailable: available >= 0 ? available : 0,
    };
  }

  async getSecuritiesWallet(userId: string) {
    return this.prisma.securitiesWallet.findMany({
      where: { userId },
      orderBy: { codeValeur: 'asc' },
    });
  }

  // Helper to add funds (e.g. Jeko deposit webhook)
  async depositCash(userId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException("Le montant doit être supérieur à zéro.");
    }

    const wallet = await this.prisma.cashWallet.findUnique({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException("Portefeuille cash introuvable.");
    }

    return this.prisma.cashWallet.update({
      where: { userId },
      data: {
        balanceTotal: wallet.balanceTotal + amount,
      },
    });
  }

  // Helper to withdraw funds
  async withdrawCash(userId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException("Le montant doit être supérieur à zéro.");
    }

    const wallet = await this.prisma.cashWallet.findUnique({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException("Portefeuille cash introuvable.");
    }

    const available = wallet.balanceTotal - wallet.balanceFrozen;
    if (available < amount) {
      throw new BadRequestException("Solde disponible insuffisant pour effectuer ce retrait.");
    }

    return this.prisma.cashWallet.update({
      where: { userId },
      data: {
        balanceTotal: wallet.balanceTotal - amount,
      },
    });
  }

  // Helper to freeze cash when placing an order
  async freezeCash(userId: string, amount: number) {
    const wallet = await this.prisma.cashWallet.findUnique({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException("Portefeuille cash introuvable.");
    }

    const available = wallet.balanceTotal - wallet.balanceFrozen;
    if (available < amount) {
      throw new BadRequestException("Solde disponible insuffisant pour geler ce montant.");
    }

    return this.prisma.cashWallet.update({
      where: { userId },
      data: {
        balanceFrozen: wallet.balanceFrozen + amount,
      },
    });
  }

  // Helper to unfreeze cash when an order is cancelled
  async unfreezeCash(userId: string, amount: number) {
    const wallet = await this.prisma.cashWallet.findUnique({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException("Portefeuille cash introuvable.");
    }

    const newFrozen = Math.max(0, wallet.balanceFrozen - amount);

    return this.prisma.cashWallet.update({
      where: { userId },
      data: {
        balanceFrozen: newFrozen,
      },
    });
  }

  // Helper to complete real execution: permanently deduct from total and reduce frozen
  async debitFrozenCash(userId: string, realAmount: number, estimatedAmountFrozen: number) {
    const wallet = await this.prisma.cashWallet.findUnique({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException("Portefeuille cash introuvable.");
    }

    const newTotal = wallet.balanceTotal - realAmount;
    const newFrozen = Math.max(0, wallet.balanceFrozen - estimatedAmountFrozen);

    if (newTotal < 0) {
      throw new BadRequestException("Le solde total ne peut pas devenir négatif.");
    }

    return this.prisma.cashWallet.update({
      where: { userId },
      data: {
        balanceTotal: newTotal,
        balanceFrozen: newFrozen,
      },
    });
  }

  // Helper to add securities to a client's wallet
  async addSecurities(userId: string, codeValeur: string, quantity: number, buyPrice: number) {
    const existing = await this.prisma.securitiesWallet.findUnique({
      where: {
        userId_codeValeur: { userId, codeValeur },
      },
    });

    if (existing) {
      // Recalculate average buy price
      const totalQty = existing.quantity + quantity;
      const totalCost = (existing.quantity * existing.averageBuyPrice) + (quantity * buyPrice);
      const newAveragePrice = totalCost / totalQty;

      return this.prisma.securitiesWallet.update({
        where: {
          userId_codeValeur: { userId, codeValeur },
        },
        data: {
          quantity: totalQty,
          averageBuyPrice: newAveragePrice,
        },
      });
    } else {
      return this.prisma.securitiesWallet.create({
        data: {
          userId,
          codeValeur,
          quantity,
          averageBuyPrice: buyPrice,
        },
      });
    }
  }

  // Helper to remove securities (selling)
  async removeSecurities(userId: string, codeValeur: string, quantity: number) {
    const existing = await this.prisma.securitiesWallet.findUnique({
      where: {
        userId_codeValeur: { userId, codeValeur },
      },
    });

    if (!existing || existing.quantity < quantity) {
      throw new BadRequestException("Quantité de titres insuffisante dans le portefeuille.");
    }

    const newQuantity = existing.quantity - quantity;

    if (newQuantity === 0) {
      return this.prisma.securitiesWallet.delete({
        where: {
          userId_codeValeur: { userId, codeValeur },
        },
      });
    } else {
      return this.prisma.securitiesWallet.update({
        where: {
          userId_codeValeur: { userId, codeValeur },
        },
        data: {
          quantity: newQuantity,
        },
      });
    }
  }
}
