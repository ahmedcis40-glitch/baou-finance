import {
  Controller, Post, Get, Body, Headers,
  UseGuards, Request, BadRequestException, Query, Res
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { PawaPayService } from './pawapay.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('pawapay')
export class PawaPayController {
  constructor(private pawaPayService: PawaPayService) {}

  // ── Client: Initiate deposit (creates a PawaPay Hosted Checkout session)
  @UseGuards(AuthGuard('jwt'))
  @Post('deposit')
  async initiateDeposit(
    @Body('amount') amount: number,
    @Body('phone') phone: string,
    @Request() req: any,
  ) {
    return this.pawaPayService.initiateDeposit(req.user.id, amount, phone);
  }

  // ── Client: Initiate withdrawal (PawaPay Payout API)
  @UseGuards(AuthGuard('jwt'))
  @Post('withdraw')
  async initiateWithdrawal(@Body('amount') amount: number, @Request() req: any) {
    return this.pawaPayService.initiateWithdrawal(req.user.id, amount);
  }

  // ── Client: Return URL after PawaPay hosted checkout completes
  // PawaPay redirects here with ?depositId=xxx after payment
  @Get('return')
  async handleReturn(@Query('depositId') depositId: string, @Res() res: Response) {
    await this.pawaPayService.handleReturn(depositId);
    // Redirect user back to the client app
    const clientUrl = process.env.CLIENT_APP_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/#/wallet?payment=success&id=${depositId}`);
  }

  // ── Client: Get my transactions
  @UseGuards(AuthGuard('jwt'))
  @Get('my')
  async getMyTransactions(@Request() req: any) {
    return this.pawaPayService.getTransactions(req.user.id);
  }

  // ── Admin: Get all transactions
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN_KYC, Role.TRADER)
  @Get('admin')
  async getAllTransactions() {
    return this.pawaPayService.getAllTransactions();
  }

  // ── PawaPay Real Webhook (called by PawaPay servers when payment completes)
  @Post('webhook')
  async handleWebhook(
    @Body() payload: any,
    @Headers('authorization') authHeader?: string,
  ) {
    const webhookSecret = process.env.PAWAPAY_WEBHOOK_SECRET || 'pawapay-shared-secret-key-for-local-development-12345';
    
    if (webhookSecret) {
      const expectedBearer = `Bearer ${webhookSecret}`;
      if (!authHeader || authHeader !== expectedBearer) {
        throw new BadRequestException("Jeton de sécurité Webhook invalide ou absent.");
      }
    }
    
    return this.pawaPayService.handleWebhook(payload);
  }

  // ── Dev tool: simulate a successful payment webhook for testing
  @Post('simulate-webhook')
  async simulateWebhook(@Body() simulationDto: any) {
    const { idInternal, status, amount } = simulationDto;
    // Simulate a real PawaPay webhook payload format
    const payload = {
      depositId: idInternal,
      payoutId: undefined,
      status: status || 'COMPLETED',
      amount: Number(amount),
      currency: 'XOF',
      created: new Date().toISOString(),
    };
    return this.pawaPayService.handleWebhook(payload);
  }
}
