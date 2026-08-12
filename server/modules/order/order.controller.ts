import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { OrderDetail, OrderSummary, PaginatedResponse } from '@shared/api.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { OrderService } from './order.service';

@UseGuards(JwtAuthGuard)
@Roles('user')
@Controller('api/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async createOrder(
    @Req() req: any,
    @Body() body: { addressId: string; remark?: string },
  ): Promise<{ orderId: string; orderNo: string; status: string }> {
    return this.orderService.createOrder(req.user.id, body.addressId, body.remark);
  }

  @Get()
  async getOrders(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ): Promise<PaginatedResponse<OrderSummary>> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
    return this.orderService.getOrders(
      req.user.id,
      Number.isNaN(pageNum) ? 1 : pageNum,
      Number.isNaN(pageSizeNum) ? 10 : pageSizeNum,
      status,
    );
  }

  @Get(':id')
  async getOrderDetail(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<OrderDetail> {
    return this.orderService.getOrderDetail(req.user.id, id);
  }

  @Post(':id/cancel')
  async cancelOrder(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ): Promise<{ success: true; status: string }> {
    return this.orderService.cancelOrder(req.user.id, id, body.reason);
  }
}
