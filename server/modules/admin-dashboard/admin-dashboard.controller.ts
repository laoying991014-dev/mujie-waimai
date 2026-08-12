import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@server/modules/auth/jwt-auth.guard';
import { Roles } from '@server/modules/auth/roles.decorator';
import { AdminDashboardService } from './admin-dashboard.service';
import type { AdminOverview, AdminTrends } from '@shared/api.interface';

@Controller('api/admin/dashboard')
@UseGuards(JwtAuthGuard)
@Roles('admin', 'super')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('overview')
  async getOverview(): Promise<AdminOverview> {
    return this.adminDashboardService.getOverview();
  }

  @Get('trends')
  async getTrends(
    @Query('period') period: 'today' | 'week' | 'month' = 'week',
  ): Promise<AdminTrends> {
    const validPeriods: Array<'today' | 'week' | 'month'> = ['today', 'week', 'month'];
    const safePeriod = validPeriods.includes(period) ? period : 'week';
    return this.adminDashboardService.getTrends(safePeriod);
  }
}
