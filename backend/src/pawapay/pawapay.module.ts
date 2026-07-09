import { Module } from '@nestjs/common';
import { PawaPayService } from './pawapay.service';
import { PawaPayController } from './pawapay.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [PrismaModule, WalletsModule],
  controllers: [PawaPayController],
  providers: [PawaPayService],
  exports: [PawaPayService],
})
export class PawaPayModule {}
