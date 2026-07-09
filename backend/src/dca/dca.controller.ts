import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DcaService } from './dca.service';

@Controller('dca')
@UseGuards(AuthGuard('jwt'))
export class DcaController {
  constructor(private readonly dcaService: DcaService) {}

  @Post('create')
  async createPlan(
    @Request() req: any,
    @Body('symbol') symbol: string,
    @Body('amount') amount: number,
    @Body('frequency') frequency: string,
  ) {
    return this.dcaService.createPlan(req.user.id, symbol, amount, frequency);
  }

  @Get('my')
  async getMyPlans(@Request() req: any) {
    return this.dcaService.getMyPlans(req.user.id);
  }

  @Put(':id/toggle')
  async togglePlan(@Request() req: any, @Param('id') id: string) {
    return this.dcaService.togglePlan(req.user.id, id);
  }

  @Delete(':id')
  async deletePlan(@Request() req: any, @Param('id') id: string) {
    return this.dcaService.deletePlan(req.user.id, id);
  }
}
