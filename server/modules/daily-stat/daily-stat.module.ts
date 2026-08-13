import { Module, OnModuleInit } from '@nestjs/common';
import { DailyStatService } from './daily-stat.service';
import { DailyStatController } from './daily-stat.controller';

@Module({
  controllers: [DailyStatController],
  providers: [DailyStatService],
  exports: [DailyStatService],
})
export class DailyStatModule implements OnModuleInit {
  constructor(private readonly dailyStatService: DailyStatService) {}

  async onModuleInit() {
    // 应用启动时检查今天是否已经统计过，如果没有则自动统计
    try {
      const calculated = await this.dailyStatService.isTodayCalculated();
      if (!calculated) {
        console.log('[DailyStat] 今日尚未统计，开始自动计算...');
        await this.dailyStatService.calculateDailyStats();
        console.log('[DailyStat] 今日统计完成');
      } else {
        console.log('[DailyStat] 今日已统计，跳过');
      }
    } catch (error) {
      console.error('[DailyStat] 自动统计失败:', error);
    }

    // 每小时检查一次，如果当天还没统计就自动统计
    // （Render免费版会休眠，这个定时器在休眠时不会执行，但应用被唤醒时会执行onModuleInit）
    setInterval(async () => {
      try {
        const calculated = await this.dailyStatService.isTodayCalculated();
        if (!calculated) {
          console.log('[DailyStat] 定时检查：今日尚未统计，开始计算...');
          await this.dailyStatService.calculateDailyStats();
          console.log('[DailyStat] 定时检查：统计完成');
        }
      } catch (error) {
        console.error('[DailyStat] 定时统计失败:', error);
      }
    }, 60 * 60 * 1000); // 每小时检查一次
  }
}
