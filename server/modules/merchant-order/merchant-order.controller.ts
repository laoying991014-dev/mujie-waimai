import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MerchantOrderService } from './merchant-order.service';
import type { Request } from 'express';
import type { JwtPayload } from '../auth/jwt-auth.guard';
import type { OrderStatus } from '@shared/api.interface';

@Controller('api/merchant/orders')
@UseGuards(JwtAuthGuard)
export class MerchantOrderController {
  constructor(private readonly merchantOrderService: MerchantOrderService) {}

  @Get()
  async getOrders(@Req() req: Request & { user: JwtPayload }, @Query('page') page?: string, @Query('pageSize') pageSize?: string, @Query('status') status?: string) {
    const pageNum = page ? parseInt(page, 10) : 1; const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
    if (isNaN(pageNum) || pageNum < 1) throw new BadRequestException('page 参数无效');
    if (isNaN(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > 50) throw new BadRequestException('pageSize 参数无效');
    return this.merchantOrderService.getOrderList(req.user.id, pageNum, pageSizeNum, status);
  }
  @Get(':id') async getOrderDetail(@Req() req: Request & { user: JwtPayload }, @Param('id') id: string) { return this.merchantOrderService.getOrderDetail(req.user.id, id); }
  @Post(':id/payment/verify') async verifyPayment(@Req() req: Request & { user: JwtPayload }, @Param('id') id: string, @Body() body: { received: boolean }) { return this.merchantOrderService.verifyPayment(req.user.id, id, body?.received === true); }
  @Post(':id/accept') async acceptOrder(@Req() req: Request & { user: JwtPayload }, @Param('id') id: string) { return this.merchantOrderService.acceptOrder(req.user.id, id); }
  @Post(':id/reject') async rejectOrder(@Req() req: Request & { user: JwtPayload }, @Param('id') id: string, @Body() body: { reason: string }) { if (!body?.reason?.trim()) throw new BadRequestException('请填写拒单原因'); return this.merchantOrderService.rejectOrder(req.user.id, id, body.reason); }
  @Post(':id/progress') async progressOrder(@Req() req: Request & { user: JwtPayload }, @Param('id') id: string, @Body() body: { targetStatus: OrderStatus }) { if (!body?.targetStatus) throw new BadRequestException('targetStatus 不能为空'); return this.merchantOrderService.progressOrder(req.user.id, id, body.targetStatus); }
}
