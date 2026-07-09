import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WalletsService } from './wallets.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('wallets')
@UseGuards(AuthGuard('jwt'))
export class WalletsController {
  constructor(private walletsService: WalletsService) {}

  @Get('cash')
  async getMyCash(@Request() req: any) {
    return this.walletsService.getCashWallet(req.user.id);
  }

  @Get('securities')
  async getMySecurities(@Request() req: any) {
    return this.walletsService.getSecuritiesWallet(req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN_KYC, Role.TRADER)
  @Get('admin/cash/:userId')
  async getClientCash(@Param('userId') userId: string) {
    return this.walletsService.getCashWallet(userId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN_KYC, Role.TRADER)
  @Get('admin/securities/:userId')
  async getClientSecurities(@Param('userId') userId: string) {
    return this.walletsService.getSecuritiesWallet(userId);
  }
}
