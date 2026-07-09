import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { PawaPayTxStatus, PawaPayTxType } from '@prisma/client';
import * as crypto from 'crypto';

export const PAWAPAY_WEBHOOK_SECRET = 'pawapay-shared-secret-key-for-local-development-12345';

@Injectable()
export class PawaPayService {
  constructor(
    private prisma: PrismaService,
    private walletsService: WalletsService,
  ) {}

  async initiateDeposit(userId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException("Le montant doit être supérieur à zéro.");
    }

    // Check client status
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.kycStatus !== 'APPROUVE') {
      throw new BadRequestException("Le KYC du compte doit être APPROUVE pour recharger.");
    }

    // Create pending internal transaction
    const transaction = await this.prisma.pawaPayTransaction.create({
      data: {
        userId,
        amount,
        type: PawaPayTxType.DEPOT,
        status: PawaPayTxStatus.EN_COURS,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'DEPOSIT_INITIATE',
        details: JSON.stringify({ amount, idInternal: transaction.idInternal }),
        ipAddress: '127.0.0.1'
      }
    });

    // REAL PAWAPAY INTEGRATION (If API Token is provided)
    const apiToken = process.env.PAWAPAY_API_TOKEN;
    if (apiToken && apiToken !== 'placeholder' && apiToken.trim() !== '') {
      const isProd = process.env.PAWAPAY_ENVIRONMENT === 'production';
      const apiUrl = isProd 
        ? 'https://api.pawapay.io/v1/widget/sessions' 
        : 'https://api.sandbox.pawapay.cloud/v1/widget/sessions';

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`
          },
          body: JSON.stringify({
            depositId: transaction.idInternal,
            amount: amount.toString(),
            currency: 'XOF',
            returnUrl: process.env.PAWAPAY_RETURN_URL || 'http://localhost:3001/#portfolio'
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.redirectUrl) {
            return {
              message: "Dépôt initié via PawaPay.",
              transactionId: transaction.idInternal,
              paymentUrl: data.redirectUrl,
            };
          }
        } else {
          const errText = await response.text();
          console.warn("PawaPay Hosted Checkout API returned error status:", response.status, errText);
        }
      } catch (error) {
        console.error("Failed to connect to PawaPay API, using sandbox simulation fallback:", error.message);
      }
    }

    // Local Sandbox Simulator URL fallback
    return {
      message: "Dépôt initié via PawaPay (Mode Sandbox).",
      transactionId: transaction.idInternal,
      paymentUrl: `https://pawapay-gate.com/pay/${transaction.idInternal}`,
    };
  }

  async handleWebhook(payload: any, signature: string) {
    // Cryptographic validation of webhook signature
    const calculatedSignature = this.generateSignature(payload);
    if (calculatedSignature !== signature) {
      throw new BadRequestException("Signature de Webhook PawaPay invalide.");
    }

    const { idInternal, idPawaPay, status, amount } = payload;

    const transaction = await this.prisma.pawaPayTransaction.findUnique({
      where: { idInternal },
    });

    if (!transaction) {
      throw new NotFoundException("Transaction PawaPay introuvable.");
    }

    if (transaction.status !== PawaPayTxStatus.EN_COURS) {
      return { message: "Transaction déjà traitée." };
    }

    const finalStatus = status === 'SUCCESS' ? PawaPayTxStatus.SUCCES : PawaPayTxStatus.ECHEC;

    // Update transaction
    await this.prisma.pawaPayTransaction.update({
      where: { idInternal },
      data: {
        idPawaPay,
        status: finalStatus,
        webhookSignature: signature,
      },
    });

    // If success, credit or debit wallet balance
    if (finalStatus === PawaPayTxStatus.SUCCES) {
      if (transaction.type === PawaPayTxType.DEPOT) {
        await this.walletsService.depositCash(transaction.userId, amount);
      } else if (transaction.type === PawaPayTxType.RETRAIT) {
        await this.walletsService.withdrawCash(transaction.userId, amount);
      }
    }

    // Write audit log
    const actionName = transaction.type === PawaPayTxType.DEPOT
      ? (finalStatus === PawaPayTxStatus.SUCCES ? 'DEPOSIT_SUCCESS' : 'DEPOSIT_FAILED')
      : (finalStatus === PawaPayTxStatus.SUCCES ? 'WITHDRAW_SUCCESS' : 'WITHDRAW_FAILED');

    await this.prisma.auditLog.create({
      data: {
        userId: transaction.userId,
        action: actionName,
        details: JSON.stringify({ amount, idInternal, idPawaPay }),
        ipAddress: '127.0.0.1'
      }
    });

    return {
      message: "Transaction traitée avec succès.",
      status: finalStatus,
      amount,
    };
  }

  async initiateWithdrawal(userId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException("Le montant doit être supérieur à zéro.");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.kycStatus !== 'APPROUVE') {
      throw new BadRequestException("Le KYC du compte doit être APPROUVE pour initier un retrait.");
    }

    // Verify cash wallet balance
    const wallet = await this.walletsService.getCashWallet(userId);
    if (wallet.balanceAvailable < amount) {
      throw new BadRequestException(`Solde disponible insuffisant (${wallet.balanceAvailable.toLocaleString()} F) pour retirer ${amount.toLocaleString()} F.`);
    }

    // Create pending internal withdrawal transaction
    const transaction = await this.prisma.pawaPayTransaction.create({
      data: {
        userId,
        amount,
        type: PawaPayTxType.RETRAIT,
        status: PawaPayTxStatus.EN_COURS,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'WITHDRAW_INITIATE',
        details: JSON.stringify({ amount, idInternal: transaction.idInternal }),
        ipAddress: '127.0.0.1'
      }
    });

    // REAL PAWAPAY PAYOUT INTEGRATION (If API Token is provided)
    const apiToken = process.env.PAWAPAY_API_TOKEN;
    if (apiToken && apiToken !== 'placeholder' && apiToken.trim() !== '') {
      const isProd = process.env.PAWAPAY_ENVIRONMENT === 'production';
      const apiUrl = isProd 
        ? 'https://api.pawapay.io/payouts' 
        : 'https://api.sandbox.pawapay.io/payouts';

      try {
        // Clean phone format
        let phoneClean = user.phone.replace(/[\s\+]/g, '');
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`
          },
          body: JSON.stringify({
            payoutId: transaction.idInternal,
            amount: amount.toString(),
            currency: 'XOF',
            country: 'CIV',
            correspondent: 'WAVE_CIV', // Or MTN_CIV, ORANGE_CIV
            recipient: {
              type: 'MSISDN',
              address: {
                value: phoneClean
              }
            },
            customerTimestamp: new Date().toISOString(),
            statementDescription: 'Retrait BAOU Finance'
          })
        });

        if (response.ok) {
          return {
            message: "Retrait initié via PawaPay Payout.",
            transactionId: transaction.idInternal,
            paymentUrl: `https://pawapay-gate.com/payout/${transaction.idInternal}`, // Fallback sandbox view
          };
        } else {
          const errText = await response.text();
          console.warn("PawaPay Payout API returned error status:", response.status, errText);
        }
      } catch (error) {
        console.error("Failed to connect to PawaPay Payout API, using sandbox simulation fallback:", error.message);
      }
    }

    // Local Sandbox Simulator URL fallback
    return {
      message: "Retrait initié via PawaPay Payout (Mode Sandbox).",
      transactionId: transaction.idInternal,
      paymentUrl: `https://pawapay-gate.com/payout/${transaction.idInternal}`,
    };
  }

  generateSignature(payload: any): string {
    const dataString = JSON.stringify({
      idInternal: payload.idInternal,
      idPawaPay: payload.idPawaPay,
      status: payload.status,
      amount: payload.amount,
    });

    return crypto
      .createHmac('sha256', PAWAPAY_WEBHOOK_SECRET)
      .update(dataString)
      .digest('hex');
  }

  async getTransactions(userId: string) {
    return this.prisma.pawaPayTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllTransactions() {
    return this.prisma.pawaPayTransaction.findMany({
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
}
