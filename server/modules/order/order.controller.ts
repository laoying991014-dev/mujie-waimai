import { Controller, Get, Post, Delete, Body, Param, Query, Req, UseGuards, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, sql } from 'drizzle-orm';
import type { OrderDetail, OrderSummary, PaginatedResponse } from '@shared/api.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { OrderService } from './order.service';
import { orderInfo, orderItem, product } from '../../database/schema';

@UseGuards(JwtAuthGuard)
@Roles('user')
@Controller('api/orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  @Post()
  async createOrder(@Req() req: any, @Body() body: { addressId: string; remark?: string }): Promise<{ orderId: string; orderNo: string; status: string }> {
    return this.orderService.createOrder(req.user.id, body.addressId, body.remark);
  }

  @Post('batch')
  async createBatchOrders(@Req() req: any, @Body() body: { addressId: string; remark?: string }) {
    return this.orderService.createOrdersFromCart(req.user.id, body.addressId, body.remark);
  }

  @Get()
  async getOrders(@Req() req: any, @Query('page') page?: string, @Query('pageSize') pageSize?: string, @Query('status') status?: string): Promise<PaginatedResponse<OrderSummary>> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
    return this.orderService.getOrders(req.user.id, Number.isNaN(pageNum) ? 1 : pageNum, Number.isNaN(pageSizeNum) ? 10 : pageSizeNum, status);
  }

  @Get(':id/payment')
  async getPaymentInfo(@Req() req: any, @Param('id') id: string) { return this.orderService.getPaymentInfo(req.user.id, id); }

  @Post(':id/payment')
  async submitPayment(@Req() req: any, @Param('id') id: string, @Body() body: { last5: string }) { return this.orderService.submitPayment(req.user.id, id, body?.last5 || ''); }

  @Delete(':id')
  async deleteOrder(@Req() req: any, @Param('id') id: string): Promise<{ success: true }> {
    const rows = await this.db.select({ id: orderInfo.id, userId: orderInfo.userId, status: orderInfo.status }).from(orderInfo).where(eq(orderInfo.id, id)).limit(1);
    if (!rows.length) throw new NotFoundException('订单不存在');
    if (rows[0].userId !== req.user.id) throw new ForbiddenException('无权删除该订单');
    const status = rows[0].status;
    const restockStatuses = ['pending_payment', 'payment_review', 'pending_accept'];
    const itemRows = restockStatuses.includes(status) ? await this.db.select({ productId: orderItem.productId, quantity: orderItem.quantity }).from(orderItem).where(eq(orderItem.orderId, id)) : [];
    await this.db.transaction(async (tx) => {
      for (const item of itemRows) await tx.update(product).set({ stock: sql`${product.stock} + ${item.quantity}` }).where(eq(product.id, item.productId));
      await tx.execute(sql`DELETE FROM order_payment WHERE order_id = ${id}`);
      await tx.delete(orderItem).where(eq(orderItem.orderId, id));
      await tx.delete(orderInfo).where(eq(orderInfo.id, id));
    });
    return { success: true };
  }

  @Get(':id')
  async getOrderDetail(@Req() req: any, @Param('id') id: string): Promise<OrderDetail> { return this.orderService.getOrderDetail(req.user.id, id); }

  @Post(':id/cancel')
  async cancelOrder(@Req() req: any, @Param('id') id: string, @Body() body: { reason: string }): Promise<{ success: true; status: string }> { return this.orderService.cancelOrder(req.user.id, id, body.reason); }
}
