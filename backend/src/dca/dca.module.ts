import { Module } from '@nestjs/common';
import { DcaService } from './dca.service';
import { DcaController } from './dca.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletsModule } from '../wallets/wallets.module';
import { MarketModule } from '../market/market.module';

@Module({
  imports: [PrismaModule, WalletsModule, MarketModule],
  controllers: [DcaController],
  providers: [DcaService],
  exports: [DcaService],
})
export class DcaModule {}
