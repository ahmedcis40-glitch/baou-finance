import { Controller, Post, Get, Body, Param, UseGuards, Request, Ip } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { Role, KYCStatus } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: any, @Ip() ipAddress: string) {
    return this.authService.register(registerDto, ipAddress);
  }

  @Post('login')
  async login(@Body() loginDto: any, @Ip() ipAddress: string) {
    return this.authService.login(loginDto, ipAddress);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getProfile(@Request() req: any) {
    return req.user;
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN_KYC, Role.TRADER)
  @Get('clients')
  async getClients() {
    return this.authService.getPendingClients();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN_KYC)
  @Post('kyc/:id')
  async validateKyc(
    @Param('id') userId: string,
    @Body('status') status: KYCStatus,
    @Request() req: any,
    @Ip() ipAddress: string,
  ) {
    return this.authService.validateKyc(userId, status, req.user.id, ipAddress);
  }
}
