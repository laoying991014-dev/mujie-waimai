import { Controller, Get, Patch, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@server/modules/auth/jwt-auth.guard';
import { Roles } from '@server/modules/auth/roles.decorator';
import { AdminOrderService } from './admin-order.service';
import type { AdminOrder, AdminOrderDetail, PaginatedResponse } from '@shared/api.interface';

@Controller('api/admin/orders')
@UseGuards(JwtAuthGuard)
@Roles('admin', 'super')
export class AdminOrderController {
  constructor(private readonly adminOrderService: AdminOrderService) {}
  @Get() async list(@Query('page') page = '1', @Query('pageSize') pageSize = '10', @Query('orderNo') orderNo?: string, @Query('merchantId') merchantId?: string, @Query('userId') userId?: string, @Query('status') status?: string, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string): Promise<PaginatedResponse<AdminOrder>> { return this.adminOrderService.list(parseInt(page, 10), parseInt(pageSize, 10), { orderNo, merchantId, userId, status, startDate, endDate }); }
  @Get(':id') async getDetail(@Param('id') id: string): Promise<AdminOrderDetail> { return this.adminOrderService.getDetail(id); }
  @Post(':id/payment/verify') async verifyPayment(@Param('id') id: string, @Body() body: { received: boolean }) { return this.adminOrderService.verifyPayment(id, body?.received === true); }
  @Patch(':id/status') async updateStatus(@Param('id') id: string, @Body() dto: { status: string }): Promise<{ success: true; status: string }> { return this.adminOrderService.updateStatus(id, dto.status); }
}
