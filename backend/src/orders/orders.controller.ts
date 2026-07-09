import { Controller, Post, Get, Body, Param, UseGuards, Request, Ip } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrdersService } from './orders.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, OrderStatus } from '@prisma/client';

@Controller('orders')
@UseGuards(AuthGuard('jwt'))
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  async createOrder(@Body() orderDto: any, @Request() req: any) {
    return this.ordersService.createOrder(req.user.id, orderDto);
  }

  @Get('my')
  async getMyOrders(@Request() req: any) {
    return this.ordersService.getMyOrders(req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.TRADER, Role.ADMIN_KYC)
  @Get('admin')
  async getAllOrders() {
    return this.ordersService.getAllOrders();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.TRADER, Role.CLIENT)
  @Post('admin/status/:id')
  async updateStatus(
    @Param('id') orderId: string,
    @Body('status') status: OrderStatus,
    @Body('priceReal') priceReal: number | null,
    @Request() req: any,
    @Ip() ipAddress: string,
  ) {
    return this.ordersService.updateOrderStatus(orderId, status, priceReal, req.user.id, ipAddress);
  }
}
