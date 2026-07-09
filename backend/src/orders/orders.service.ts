import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { OrderStatus, OrderType, Role } from '@prisma/client';

export const COMMISSION_RATE = 0.015; // SGI takes 1.5% commission

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private walletsService: WalletsService,
  ) {}

  async createOrder(userId: string, dto: any) {
    const { type, codeValeur, quantityRequested, priceRequested } = dto;

    if (quantityRequested <= 0 || priceRequested <= 0) {
      throw new BadRequestException("La quantité et le prix doivent être supérieurs à zéro.");
    }

    // Check if user is approved
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.kycStatus !== 'APPROUVE') {
      throw new BadRequestException("Votre compte n'est pas encore approuvé par le KYC.");
    }

    if (type === OrderType.ACHAT) {
      // Calculate estimated cost
      const estimatedCost = quantityRequested * priceRequested * (1 + COMMISSION_RATE);
      // Freeze the cash
      await this.walletsService.freezeCash(userId, estimatedCost);
    } else if (type === OrderType.VENTE) {
      // Escrow the securities (remove from wallet upfront)
      await this.walletsService.removeSecurities(userId, codeValeur, quantityRequested);
    } else {
      throw new BadRequestException("Type d'ordre invalide.");
    }

    // Create the order
    const order = await this.prisma.order.create({
      data: {
        userId,
        type,
        codeValeur,
        quantityRequested,
        priceRequested,
        status: OrderStatus.EN_ATTENTE,
        sgiPartenaireId: user.sgiPartenaire || "Société Générale Capital Securities",
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'ORDER_PLACE',
        details: JSON.stringify({ orderId: order.id, type, codeValeur, quantityRequested, priceRequested }),
        ipAddress: '127.0.0.1'
      }
    });

    return order;
  }

  async getMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllOrders() {
    return this.prisma.order.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, priceReal: number | null, traderId: string, ipAddress: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException("Ordre introuvable.");
    }

    if (order.status === OrderStatus.EXECUTE || order.status === OrderStatus.ANNULE) {
      throw new BadRequestException("Cet ordre est déjà finalisé.");
    }

    if (status === OrderStatus.EN_TRAITEMENT) {
      const updated = await this.prisma.order.update({
        where: { id: orderId },
        data: { status },
      });

      // Log in audit log
      await this.prisma.auditLog.create({
        data: {
          userId: traderId,
          action: 'ORDER_PROCESSING',
          details: JSON.stringify({ orderId }),
          ipAddress,
        },
      });

      return updated;
    }

    if (status === OrderStatus.EXECUTE) {
      const finalPrice = priceReal && priceReal > 0 ? priceReal : order.priceRequested;
      let financialImpact = {};

      if (order.type === OrderType.ACHAT) {
        const estimatedFrozen = order.quantityRequested * order.priceRequested * (1 + COMMISSION_RATE);
        const realCost = order.quantityRequested * finalPrice * (1 + COMMISSION_RATE);

        // Debit cash (reduces total balance and unfreezes estimated amount)
        await this.walletsService.debitFrozenCash(order.userId, realCost, estimatedFrozen);

        // Add the securities to the wallet
        await this.walletsService.addSecurities(order.userId, order.codeValeur, order.quantityRequested, finalPrice);

        financialImpact = { realCost, estimatedFrozen };
      } else if (order.type === OrderType.VENTE) {
        const realEarnings = order.quantityRequested * finalPrice * (1 - COMMISSION_RATE);

        // Add earnings to cash wallet
        await this.walletsService.depositCash(order.userId, realEarnings);

        financialImpact = { realEarnings };
      }

      const updated = await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status,
          priceReal: finalPrice,
        },
      });

      // Log in audit log
      await this.prisma.auditLog.create({
        data: {
          userId: traderId,
          action: 'ORDER_EXECUTION',
          details: JSON.stringify({
            orderId,
            type: order.type,
            codeValeur: order.codeValeur,
            quantity: order.quantityRequested,
            priceRequested: order.priceRequested,
            priceReal: finalPrice,
            financialImpact,
          }),
          ipAddress,
        },
      });

      return updated;
    }

    if (status === OrderStatus.ANNULE) {
      if (order.type === OrderType.ACHAT) {
        const estimatedFrozen = order.quantityRequested * order.priceRequested * (1 + COMMISSION_RATE);
        // Unfreeze cash
        await this.walletsService.unfreezeCash(order.userId, estimatedFrozen);
      } else if (order.type === OrderType.VENTE) {
        // Return securities to wallet
        await this.walletsService.addSecurities(order.userId, order.codeValeur, order.quantityRequested, order.priceRequested);
      }

      const updated = await this.prisma.order.update({
        where: { id: orderId },
        data: { status },
      });

      // Log in audit log
      await this.prisma.auditLog.create({
        data: {
          userId: traderId,
          action: 'ORDER_CANCELLATION',
          details: JSON.stringify({ orderId }),
          ipAddress,
        },
      });

      return updated;
    }

    throw new BadRequestException("Statut d'ordre non supporté.");
  }
}
