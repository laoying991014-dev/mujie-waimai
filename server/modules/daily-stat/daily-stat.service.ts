import { Inject, Injectable, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, gte, lte, sql, desc, type SQL } from 'drizzle-orm';
import { merchant, orderInfo, merchantDailyStat } from '../../database/schema';

@Injectable()
export class DailyStatService {
  private readonly logger = new Logger(DailyStatService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  /**
   * 计算指定日期的商家配送费统计
   * 日期按缅甸时间（Asia/Yangon，UTC+6:30）计算，避免服务器 UTC 时区导致跨日。
   */
  async calculateDailyStats(date?: string): Promise<{ count: number }> {
    const targetDate = date || this.getTodayString();
    this.logger.log(`开始计算 ${targetDate} 的商家配送费统计`);

    try {
      const merchants = await this.db.select({ id: merchant.id }).from(merchant);

      let calculatedCount = 0;

      // 缅甸当天 00:00 到 23:59:59.999，对应 UTC 的时间范围。
      const dayStart = this.myanmarDateToUtcStart(targetDate);
      const nextDayStart = this.myanmarDateToUtcStart(this.addOneDay(targetDate));
      const dayEnd = new Date(nextDayStart.getTime() - 1);

      for (const m of merchants) {
        const orders = await this.db
          .select({
            id: orderInfo.id,
            deliveryFee: orderInfo.deliveryFee,
            totalAmount: orderInfo.totalAmount,
          })
          .from(orderInfo)
          .where(
            and(
              eq(orderInfo.merchantId, m.id),
              gte(orderInfo.createdAt, dayStart),
              lte(orderInfo.createdAt, dayEnd),
            ),
          );

        const totalOrders = orders.length;
        const totalDeliveryFee = orders.reduce(
          (sum, o) => sum + Number(o.deliveryFee || 0),
          0,
        );
        const totalRevenue = orders.reduce(
          (sum, o) => sum + Number(o.totalAmount || 0),
          0,
        );

        const existing = await this.db
          .select({ id: merchantDailyStat.id })
          .from(merchantDailyStat)
          .where(
            and(
              eq(merchantDailyStat.merchantId, m.id),
              eq(merchantDailyStat.statDate, targetDate),
            ),
          )
          .limit(1);

        if (existing.length > 0) {
          await this.db
            .update(merchantDailyStat)
            .set({
              totalOrders,
              totalDeliveryFee: String(totalDeliveryFee),
              totalRevenue: String(totalRevenue),
              updatedAt: new Date(),
            })
            .where(eq(merchantDailyStat.id, existing[0].id));
        } else {
          await this.db.insert(merchantDailyStat).values({
            merchantId: m.id,
            statDate: targetDate,
            totalOrders,
            totalDeliveryFee: String(totalDeliveryFee),
            totalRevenue: String(totalRevenue),
          });
        }

        calculatedCount++;
      }

      this.logger.log(`完成 ${targetDate} 的商家配送费统计，共处理 ${calculatedCount} 个商家`);
      return { count: calculatedCount };
    } catch (error) {
      this.logger.error('计算每日统计失败', error);
      throw error;
    }
  }

  async getMerchantDailyStats(
    merchantId?: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    pageSize = 30,
  ): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const offset = (page - 1) * pageSize;
    const conditions: SQL[] = [];

    if (merchantId) conditions.push(eq(merchantDailyStat.merchantId, merchantId));
    if (startDate) conditions.push(gte(merchantDailyStat.statDate, startDate));
    if (endDate) conditions.push(lte(merchantDailyStat.statDate, endDate));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [itemsResult, totalResult] = await Promise.all([
      this.db
        .select({
          id: merchantDailyStat.id,
          merchantId: merchantDailyStat.merchantId,
          shopName: merchant.shopName,
          statDate: merchantDailyStat.statDate,
          totalOrders: merchantDailyStat.totalOrders,
          totalDeliveryFee: merchantDailyStat.totalDeliveryFee,
          totalRevenue: merchantDailyStat.totalRevenue,
          createdAt: merchantDailyStat.createdAt,
        })
        .from(merchantDailyStat)
        .leftJoin(merchant, eq(merchantDailyStat.merchantId, merchant.id))
        .where(whereClause)
        .orderBy(desc(merchantDailyStat.statDate))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(merchantDailyStat)
        .where(whereClause),
    ]);

    return {
      items: itemsResult,
      total: Number(totalResult[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async isTodayCalculated(): Promise<boolean> {
    const today = this.getTodayString();
    const result = await this.db
      .select({ id: merchantDailyStat.id })
      .from(merchantDailyStat)
      .where(eq(merchantDailyStat.statDate, today))
      .limit(1);
    return result.length > 0;
  }

  private getTodayString(): string {
    const now = new Date();
    const myanmarTime = new Date(now.getTime() + 6.5 * 60 * 60 * 1000);
    const year = myanmarTime.getUTCFullYear();
    const month = String(myanmarTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(myanmarTime.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private myanmarDateToUtcStart(date: string): Date {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - 6.5 * 60 * 60 * 1000);
  }

  private addOneDay(date: string): string {
    const [year, month, day] = date.split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
  }
}
