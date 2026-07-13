import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { PawaPayTxStatus, PawaPayTxType } from '@prisma/client';
import * as crypto from 'crypto';

export const PAWAPAY_WEBHOOK_SECRET = 'pawapay-shared-secret-key-for-local-development-12345';

// PawaPay Sandbox base URL
const PAWAPAY_SANDBOX_BASE = 'https://api.sandbox.pawapay.cloud';
const PAWAPAY_PROD_BASE = 'https://api.pawapay.io';

@Injectable()
export class PawaPayService {
  private readonly logger = new Logger(PawaPayService.name);

  constructor(
    private prisma: PrismaService,
    private walletsService: WalletsService,
  ) {}

  private getBaseUrl(): string {
    if (process.env.PAWAPAY_API_URL) {
      return process.env.PAWAPAY_API_URL;
    }
    return process.env.PAWAPAY_ENVIRONMENT === 'production'
      ? PAWAPAY_PROD_BASE
      : PAWAPAY_SANDBOX_BASE;
  }

  private getApiToken(): string | null {
    const token = process.env.PAWAPAY_API_TOKEN || process.env.PAWAPAY_API_KEY;
    if (!token || token === 'placeholder' || token.trim() === '') return null;
    return token;
  }

  // Detect correspondent from phone number prefix
  private detectCorrespondent(phone: string): { correspondent: string; country: string } {
    const clean = phone.replace(/[\s\+]/g, '');
    // Côte d'Ivoire (+225)
    if (clean.startsWith('225') || clean.startsWith('07') || clean.startsWith('05') || clean.startsWith('01')) {
      if (clean.startsWith('22507') || clean.startsWith('07')) return { correspondent: 'WAVE_CIV', country: 'CIV' };
      if (clean.startsWith('22505') || clean.startsWith('05')) return { correspondent: 'MTN_MOMO_CIV', country: 'CIV' };
      if (clean.startsWith('22501') || clean.startsWith('01')) return { correspondent: 'ORANGE_CIV', country: 'CIV' };
      return { correspondent: 'WAVE_CIV', country: 'CIV' }; // default CI
    }
    // Sénégal (+221)
    if (clean.startsWith('221')) return { correspondent: 'ORANGE_SEN', country: 'SEN' };
    // Burkina Faso (+226)
    if (clean.startsWith('226')) return { correspondent: 'ORANGE_BFA', country: 'BFA' };
    // Default fallback for sandbox testing
    return { correspondent: 'MTN_MOMO_GHA', country: 'GHA' };
  }

  async initiateDeposit(userId: string, amount: number, phone?: string) {
    if (amount <= 0) {
      throw new BadRequestException("Le montant doit être supérieur à zéro.");
    }

    // Check client KYC status
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
        ipAddress: '127.0.0.1',
      },
    });

    const apiToken = this.getApiToken();
    if (apiToken) {
      const baseUrl = this.getBaseUrl();
      const isV2 = baseUrl.includes('/v2');
      const widgetUrl = isV2 
        ? `${baseUrl}/paymentpage` 
        : `${baseUrl}/v1/widget/sessions`;
      const returnUrl = process.env.PAWAPAY_RETURN_URL || 'https://baoufinance-api.loca.lt/pawapay/return';

      const userPhone = phone || user.phone || '2250700000000';
      const cleanPhone = userPhone.replace(/[\s\+]/g, '');
      const { country, correspondent } = this.detectCorrespondent(cleanPhone);

      const bodyPayload = isV2 ? {
        depositId: transaction.idInternal,
        returnUrl: returnUrl,
        amountDetails: {
          amount: amount.toFixed(2),
          currency: 'XOF',
        },
        phoneNumber: cleanPhone,
        language: 'FR',
        country: country === 'GHA' ? 'GHA' : 'CIV',
        reason: 'Dépôt BAOU Finance',
      } : {
        depositId: transaction.idInternal,
        amount: amount.toFixed(2),
        currency: 'XOF',
        returnUrl: returnUrl,
        webhookUrl: process.env.PAWAPAY_WEBHOOK_URL || 'https://baoufinance-api.loca.lt/pawapay/webhook',
        reason: 'Dépôt BAOU Finance',
      };

      try {
        this.logger.log(`[PawaPay] Initiating deposit ${transaction.idInternal} via ${isV2 ? 'v2/paymentpage' : 'v1/widget/sessions'} - amount: ${amount} XOF`);
        const response = await fetch(widgetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`,
          },
          body: JSON.stringify(bodyPayload),
        });

        const responseText = await response.text();
        this.logger.log(`[PawaPay] Session response: ${response.status} ${responseText}`);

        if (response.ok) {
          const data = JSON.parse(responseText);
          const redirectUrl = data && (data.redirectUrl || data.paymentUrl);
          if (redirectUrl) {
            return {
              message: "Dépôt initié via PawaPay Hosted Checkout.",
              transactionId: transaction.idInternal,
              paymentUrl: redirectUrl,
              mode: 'pawapay_live',
            };
          }
        }
        this.logger.warn(`[PawaPay] Session failed, trying direct deposit API...`);
      } catch (error) {
        this.logger.error(`[PawaPay] Session error: ${error.message}`);
      }

      // Fallback: Try direct deposit API
      const depositUrl = isV2 
        ? `${baseUrl}/deposits` 
        : `${baseUrl}/v1/deposits`;

      const directBody = isV2 ? {
        depositId: transaction.idInternal,
        amountDetails: {
          amount: amount.toFixed(2),
          currency: 'XOF',
        },
        country: country === 'GHA' ? 'GHA' : 'CIV',
        correspondent,
        payer: {
          type: 'MSISDN',
          address: { value: cleanPhone },
        },
        customerTimestamp: new Date().toISOString(),
        statementDescription: 'Depot BAOU Finance',
      } : {
        depositId: transaction.idInternal,
        amount: amount.toFixed(2),
        currency: 'XOF',
        country,
        correspondent,
        payer: {
          type: 'MSISDN',
          address: { value: cleanPhone },
        },
        customerTimestamp: new Date().toISOString(),
        statementDescription: 'Depot BAOU Finance',
      };

      try {
        const response = await fetch(depositUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`,
          },
          body: JSON.stringify(directBody),
        });

        const responseText = await response.text();
        this.logger.log(`[PawaPay] Direct deposit response: ${response.status} ${responseText}`);

        if (response.ok || response.status === 202) {
          const data = JSON.parse(responseText);
          return {
            message: "Dépôt initié via PawaPay Direct API. Confirmez sur votre téléphone.",
            transactionId: transaction.idInternal,
            paymentUrl: null,
            pawaPayDepositId: data.depositId,
            status: data.status,
            mode: 'pawapay_direct',
          };
        }
        this.logger.warn(`[PawaPay] Direct deposit also failed: ${response.status} ${responseText}`);
      } catch (error) {
        this.logger.error(`[PawaPay] Direct deposit error: ${error.message}`);
      }
    }

    // Local Sandbox Simulator URL fallback
    this.logger.warn('[PawaPay] No valid API token or all PawaPay calls failed. Returning sandbox simulation URL.');
    return {
      message: "Dépôt initié (Mode Sandbox de test).",
      transactionId: transaction.idInternal,
      paymentUrl: `https://sandbox.pawapay.cloud/demo/pay?depositId=${transaction.idInternal}`,
      mode: 'sandbox_simulation',
    };
  }

  async handleReturn(depositId: string) {
    // Called when user returns from PawaPay hosted page
    if (!depositId) return { message: 'Dépôt en attente de confirmation.', status: 'PENDING' };

    const transaction = await this.prisma.pawaPayTransaction.findUnique({
      where: { idInternal: depositId },
    });

    if (!transaction) return { message: 'Transaction introuvable.', status: 'NOT_FOUND' };

    // Check PawaPay for real status if we have a token
    const apiToken = this.getApiToken();
    if (apiToken && transaction.status === PawaPayTxStatus.EN_COURS) {
      try {
        const url = `${this.getBaseUrl()}/deposits/${depositId}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${apiToken}` },
        });

        if (response.ok) {
          const data = await response.json();
          this.logger.log(`[PawaPay] Deposit status check: ${JSON.stringify(data)}`);
          if (data.status === 'COMPLETED') {
            await this.creditDeposit(transaction, data.amount || transaction.amount, data.depositId);
          }
        }
      } catch (e) {
        this.logger.error(`[PawaPay] Return status check error: ${e.message}`);
      }
    }

    return {
      message: 'Retour de paiement reçu.',
      transactionId: depositId,
      status: transaction.status,
    };
  }

  private async creditDeposit(transaction: any, amount: number, idPawaPay: string) {
    if (transaction.status === PawaPayTxStatus.SUCCES) return;

    await this.prisma.pawaPayTransaction.update({
      where: { idInternal: transaction.idInternal },
      data: { idPawaPay, status: PawaPayTxStatus.SUCCES },
    });

    await this.walletsService.depositCash(transaction.userId, Number(amount));

    await this.prisma.auditLog.create({
      data: {
        userId: transaction.userId,
        action: 'DEPOSIT_SUCCESS',
        details: JSON.stringify({ amount, idInternal: transaction.idInternal, idPawaPay }),
        ipAddress: '127.0.0.1',
      },
    });
  }

  async handleWebhook(payload: any) {
    // PawaPay Real Webhook Format:
    // { depositId, payoutId, refundId, status, amount, currency, ... }
    this.logger.log(`[PawaPay] Webhook received: ${JSON.stringify(payload)}`);

    const idInternal = payload.depositId || payload.payoutId;
    const status = payload.status;
    const amount = Number(payload.amount);
    const idPawaPay = payload.depositId || payload.payoutId;

    if (!idInternal) {
      this.logger.warn('[PawaPay] Webhook missing depositId/payoutId');
      return { message: 'OK' };
    }

    const transaction = await this.prisma.pawaPayTransaction.findUnique({
      where: { idInternal },
    });

    if (!transaction) {
      this.logger.warn(`[PawaPay] Transaction not found: ${idInternal}`);
      return { message: 'OK' }; // Always return 200 to PawaPay
    }

    if (transaction.status !== PawaPayTxStatus.EN_COURS) {
      return { message: "Transaction déjà traitée." };
    }

    const isSuccess = status === 'COMPLETED';
    const finalStatus = isSuccess ? PawaPayTxStatus.SUCCES : PawaPayTxStatus.ECHEC;

    await this.prisma.pawaPayTransaction.update({
      where: { idInternal },
      data: { idPawaPay, status: finalStatus },
    });
    if (isSuccess) {
      if (transaction.type === PawaPayTxType.DEPOT) {
        await this.walletsService.depositCash(transaction.userId, amount || transaction.amount);
      }
    } else {
      if (transaction.type === PawaPayTxType.RETRAIT) {
        // Recréditer le solde cash si la transaction de retrait a échoué (débité à l'initiation)
        await this.walletsService.depositCash(transaction.userId, transaction.amount);
      }
    }

    const actionName =
      transaction.type === PawaPayTxType.DEPOT
        ? (isSuccess ? 'DEPOSIT_SUCCESS' : 'DEPOSIT_FAILED')
        : (isSuccess ? 'WITHDRAW_SUCCESS' : 'WITHDRAW_FAILED');

    await this.prisma.auditLog.create({
      data: {
        userId: transaction.userId,
        action: actionName,
        details: JSON.stringify({ amount, idInternal, idPawaPay, status }),
        ipAddress: '127.0.0.1',
      },
    });

    return { message: "Webhook PawaPay traité." };
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
      throw new BadRequestException(
        `Solde insuffisant (${wallet.balanceAvailable.toLocaleString()} F CFA) pour retirer ${amount.toLocaleString()} F CFA.`
      );
    }

    // Create pending withdrawal transaction
    const transaction = await this.prisma.pawaPayTransaction.create({
      data: {
        userId,
        amount,
        type: PawaPayTxType.RETRAIT,
        status: PawaPayTxStatus.EN_COURS,
      },
    });

    // Débiter immédiatement le solde cash de l'utilisateur pour éviter les retraits concurrents (Article 54)
    await this.walletsService.withdrawCash(userId, amount);

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'WITHDRAW_INITIATE',
        details: JSON.stringify({ amount, idInternal: transaction.idInternal }),
        ipAddress: '127.0.0.1',
      },
    });

    const apiToken = this.getApiToken();
    if (apiToken) {
      const payoutUrl = `${this.getBaseUrl()}/payouts`;
      const phoneNumber = user.phone || '';
      const { correspondent, country } = this.detectCorrespondent(phoneNumber);
      const cleanPhone = phoneNumber.replace(/[\s\+]/g, '');

      try {
        this.logger.log(`[PawaPay] Initiating payout ${transaction.idInternal} - ${amount} XOF to ${cleanPhone}`);
        const response = await fetch(payoutUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`,
          },
          body: JSON.stringify({
            payoutId: transaction.idInternal,
            amount: amount.toFixed(2),
            currency: 'XOF',
            country,
            correspondent,
            recipient: {
              type: 'MSISDN',
              address: { value: cleanPhone || '2250700000000' },
            },
            customerTimestamp: new Date().toISOString(),
            statementDescription: 'Retrait BAOU Finance',
          }),
        });

        const responseText = await response.text();
        this.logger.log(`[PawaPay] Payout response: ${response.status} ${responseText}`);

        if (response.ok || response.status === 202) {
          return {
            message: "Retrait initié via PawaPay. Vous recevrez les fonds sur votre Mobile Money.",
            transactionId: transaction.idInternal,
            mode: 'pawapay_live',
          };
        }
        this.logger.warn(`[PawaPay] Payout failed: ${response.status} ${responseText}`);
      } catch (error) {
        this.logger.error(`[PawaPay] Payout error: ${error.message}`);
      }
    }

    return {
      message: "Retrait initié (Mode Sandbox). Les fonds seront envoyés sur votre Mobile Money.",
      transactionId: transaction.idInternal,
      mode: 'sandbox_simulation',
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
          select: { id: true, email: true, firstName: true, lastName: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDebugInfo() {
    const apiToken = this.getApiToken();
    const webhookSecret = process.env.PAWAPAY_WEBHOOK_SECRET;

    return {
      apiUrl: this.getBaseUrl(),
      apiKeyConfigured: !!apiToken,
      apiKeyMasked: apiToken 
        ? `${apiToken.substring(0, 10)}...${apiToken.substring(apiToken.length - 10)}` 
        : 'Non configurée',
      webhookSecretConfigured: !!webhookSecret,
      webhookSecretMasked: webhookSecret
        ? `${webhookSecret.substring(0, 5)}...`
        : 'Non configuré (utilise la clé de dev locale par défaut)',
      environment: process.env.PAWAPAY_ENVIRONMENT || 'sandbox',
    };
  }

  async testConnection() {
    const apiToken = this.getApiToken();
    if (!apiToken) {
      return { success: false, error: "Clé API non configurée." };
    }
    const baseUrl = this.getBaseUrl();
    const isV2 = baseUrl.includes('/v2');
    const endpoint = isV2 
      ? `${baseUrl}/active-configuration` 
      : `${baseUrl}/v1/active-configuration`; // fallback

    try {
      this.logger.log(`[PawaPay Debug] Testing connection to ${endpoint}`);
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });
      const responseText = await response.text();
      if (response.ok) {
        let data = {};
        try {
          data = JSON.parse(responseText);
        } catch(e) {
          data = { response: responseText };
        }
        return {
          success: true,
          message: "Connexion réussie avec PawaPay !",
          status: response.status,
          data
        };
      } else {
        return {
          success: false,
          status: response.status,
          error: `Erreur HTTP ${response.status}: ${responseText}`
        };
      }
    } catch (e) {
      return {
        success: false,
        error: `Erreur réseau : ${e.message}`
      };
    }
  }

  async getPawaPayLogs() {
    return this.prisma.auditLog.findMany({
      where: {
        OR: [
          { action: { startsWith: 'DEPOSIT_' } },
          { action: { startsWith: 'WITHDRAW_' } },
          { action: { contains: 'PAWAPAY' } }
        ]
      },
      include: {
        user: {
          select: { email: true, firstName: true, lastName: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
