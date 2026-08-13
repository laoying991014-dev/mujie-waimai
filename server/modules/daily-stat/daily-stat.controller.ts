import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@server/modules/auth/jwt-auth.guard';
import { Roles } from '@server/modules/auth/roles.decorator';
import { DailyStatService } from './daily-stat.service';

@Controller('api/admin/daily-stats')
@UseGuards(JwtAuthGuard)
@Roles('admin', 'super')
export class DailyStatController {
  constructor(private readonly dailyStatService: DailyStatService) {}

  @Get()
  async list(
    @Query('merchantId') merchantId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '30',
  ) {
    return this.dailyStatService.getMerchantDailyStats(
      merchantId,
      startDate,
      endDate,
      parseInt(page, 10),
      parseInt(pageSize, 10),
    );
  }

  @Post('calculate')
  async calculate(@Query('date') date?: string) {
    return this.dailyStatService.calculateDailyStats(date);
  }
}
