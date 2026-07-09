import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from './audit.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('audit')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN_KYC, Role.TRADER)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  async getLogs() {
    return this.auditService.getLogs();
  }
}
