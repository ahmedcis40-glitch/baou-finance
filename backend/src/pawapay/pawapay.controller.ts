import { Controller, Post, Get, Body, Headers, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PawaPayService } from './pawapay.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('pawapay')
export class PawaPayController {
  constructor(private pawaPayService: PawaPayService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('deposit')
  async initiateDeposit(@Body('amount') amount: number, @Request() req: any) {
    return this.pawaPayService.initiateDeposit(req.user.id, amount);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('withdraw')
  async initiateWithdrawal(@Body('amount') amount: number, @Request() req: any) {
    return this.pawaPayService.initiateWithdrawal(req.user.id, amount);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my')
  async getMyTransactions(@Request() req: any) {
    return this.pawaPayService.getTransactions(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN_KYC, Role.TRADER)
  @Get('admin')
  async getAllTransactions() {
    return this.pawaPayService.getAllTransactions();
  }

  @Post('webhook')
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-pawapay-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException("En-tête x-pawapay-signature manquant.");
    }
    return this.pawaPayService.handleWebhook(payload, signature);
  }

  @Post('simulate-webhook')
  async simulateWebhook(@Body() simulationDto: any) {
    const { idInternal, status, amount } = simulationDto;

    const payload = {
      idInternal,
      idPawaPay: `pawapay_tx_${Math.random().toString(36).substr(2, 9)}`,
      status: status || 'SUCCESS',
      amount: Number(amount),
    };

    const signature = this.pawaPayService.generateSignature(payload);

    return {
      payload,
      signature,
      instructions: "Effectuez une requête POST vers /pawapay/webhook avec ces données et l'en-tête 'x-pawapay-signature'.",
    };
  }
}
