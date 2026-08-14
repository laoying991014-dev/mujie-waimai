import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { RiderOrderService } from './rider-order.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/rider/orders')
@UseGuards(JwtAuthGuard)
export class RiderOrderController {
  constructor(private readonly riderOrderService: RiderOrderService) {}

  // 获取待接单订单列表（骑手大厅）
  @Get('pending')
  async getPendingOrders(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
  ) {
    return this.riderOrderService.getPendingOrders(
      parseInt(page, 10),
      parseInt(pageSize, 10),
    );
  }

  // 骑手抢单
  @Post(':id/accept')
  async acceptOrder(@Req() req: any, @Param('id') orderId: string) {
    return this.riderOrderService.acceptOrder(req.user.id, orderId);
  }

  // 骑手取餐
  @Post(':id/pickup')
  async pickupOrder(@Req() req: any, @Param('id') orderId: string) {
    return this.riderOrderService.pickupOrder(req.user.id, orderId);
  }

  // 骑手送达
  @Post(':id/deliver')
  async deliverOrder(@Req() req: any, @Param('id') orderId: string) {
    return this.riderOrderService.deliverOrder(req.user.id, orderId);
  }

  // 获取骑手订单列表
  @Get()
  async getRiderOrders(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('status') status?: string,
  ) {
    return this.riderOrderService.getRiderOrders(
      req.user.id,
      parseInt(page, 10),
      parseInt(pageSize, 10),
      status,
    );
  }

  // 获取订单详情
  @Get(':id')
  async getOrderDetail(@Req() req: any, @Param('id') orderId: string) {
    return this.riderOrderService.getOrderDetail(req.user.id, orderId);
  }
}

@Controller('api/rider')
@UseGuards(JwtAuthGuard)
export class RiderController {
  constructor(private readonly riderOrderService: RiderOrderService) {}

  // 更新在线状态
  @Post('online-status')
  async updateOnlineStatus(@Req() req: any, @Body() body: { onlineStatus: string }) {
    return this.riderOrderService.updateOnlineStatus(req.user.id, body.onlineStatus);
  }

  // 获取骑手统计信息
  @Get('stats')
  async getRiderStats(@Req() req: any) {
    return this.riderOrderService.getRiderStats(req.user.id);
  }
}
