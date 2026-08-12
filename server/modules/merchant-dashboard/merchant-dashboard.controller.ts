import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MerchantDashboardService } from './merchant-dashboard.service';
import type { Request } from 'express';
import type { JwtPayload } from '../auth/jwt-auth.guard';

@Controller('api/merchant/dashboard')
@UseGuards(JwtAuthGuard)
export class MerchantDashboardController {
  constructor(
    private readonly merchantDashboardService: MerchantDashboardService,
  ) {}

  @Get('stats')
  async getStats(@Req() req: Request & { user: JwtPayload }) {
    return this.merchantDashboardService.getStats(req.user.id);
  }

  @Get('pending-orders')
  async getPendingOrders(
    @Req() req: Request & { user: JwtPayload },
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.merchantDashboardService.getPendingOrders(
      req.user.id,
      limitNum,
    );
  }
}
