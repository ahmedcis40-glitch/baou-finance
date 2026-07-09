import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Role, KYCStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: any, ipAddress?: string) {
    const { 
      email, password, firstName, lastName, phone, whatsappPhone,
      consentSMS, consentWhatsApp, kycDocuments, sgiPartenaire,
      investorProfile, investorHorizon, investorObjective 
    } = dto;

    // Check email uniqueness
    const existingEmail = await this.prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new ConflictException('Cette adresse email est déjà utilisée.');
    }

    // Check phone uniqueness
    const existingPhone = await this.prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      throw new ConflictException('Ce numéro de téléphone est déjà utilisé.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and initialize their cash wallet
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        whatsappPhone: whatsappPhone || phone,
        consentSMS: consentSMS ?? true,
        consentWhatsApp: consentWhatsApp ?? true,
        investorProfile: investorProfile || "MODERE",
        investorHorizon: investorHorizon || "MOYEN_TERME",
        investorObjective: investorObjective || "EPARGNE",
        sgiPartenaire: sgiPartenaire || "Société Générale Capital Securities",
        kycStatus: KYCStatus.EN_ATTENTE_VALIDATION,
        kycDocuments: kycDocuments ? JSON.stringify(kycDocuments) : null,
        role: Role.CLIENT,
        cashWallet: {
          create: {
            balanceTotal: 0.0,
            balanceFrozen: 0.0,
            currency: 'XOF',
          },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        whatsappPhone: true,
        role: true,
        kycStatus: true,
        consentWhatsApp: true,
        investorProfile: true,
        sgiPartenaire: true,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_REGISTER',
        details: JSON.stringify({ email: user.email, sgiPartenaire: user.sgiPartenaire, investorProfile: user.investorProfile }),
        ipAddress: ipAddress || '127.0.0.1',
      }
    });

    return user;
  }

  async login(dto: any, ipAddress?: string) {
    const { email, password } = dto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Identifiants incorrects.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants incorrects.');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        details: JSON.stringify({ email: user.email, role: user.role }),
        ipAddress: ipAddress || '127.0.0.1',
      }
    });

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        whatsappPhone: user.whatsappPhone,
        role: user.role,
        kycStatus: user.kycStatus,
        consentSMS: user.consentSMS,
        consentWhatsApp: user.consentWhatsApp,
        investorProfile: user.investorProfile,
        investorHorizon: user.investorHorizon,
        investorObjective: user.investorObjective,
        sgiPartenaire: user.sgiPartenaire,
      },
    };
  }

  async validateKyc(userId: string, status: KYCStatus, adminId: string, ipAddress: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { kycStatus: status },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        kycStatus: true,
      },
    });

    // Ensure they have a CashWallet if approved (normally created on registration, but fallback here)
    if (status === KYCStatus.APPROUVE) {
      const existingWallet = await this.prisma.cashWallet.findUnique({ where: { userId } });
      if (!existingWallet) {
        await this.prisma.cashWallet.create({
          data: {
            userId,
            balanceTotal: 0.0,
            balanceFrozen: 0.0,
            currency: 'XOF',
          },
        });
      }
    }

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'KYC_VALIDATION',
        details: JSON.stringify({
          targetUserId: userId,
          targetUserEmail: user.email,
          previousStatus: user.kycStatus,
          newStatus: status,
        }),
        ipAddress,
      },
    });

    return updatedUser;
  }

  async getPendingClients() {
    return this.prisma.user.findMany({
      where: {
        role: Role.CLIENT,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        kycStatus: true,
        kycDocuments: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
