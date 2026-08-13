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
   */
  async calculateDailyStats(date?: string): Promise<{ count: number }> {
    const targetDate = date || this.getTodayString();
    this.logger.log(`开始计算 ${targetDate} 的商家配送费统计`);

    try {
      // 获取所有商家
      const merchants = await this.db.select({ id: merchant.id }).from(merchant);

      let calculatedCount = 0;

      for (const m of merchants) {
        // 查询该商家当天的已完成订单
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
              gte(orderInfo.createdAt, `${targetDate} 00:00:00`),
              lte(orderInfo.createdAt, `${targetDate} 23:59:59`),
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

        // 检查是否已有统计记录
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
          // 更新已有记录
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
          // 创建新记录
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

  /**
   * 获取商家每日统计列表
   */
  async getMerchantDailyStats(
    merchantId?: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    pageSize = 30,
  ): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const offset = (page - 1) * pageSize;
    const conditions: SQL[] = [];

    if (merchantId) {
      conditions.push(eq(merchantDailyStat.merchantId, merchantId));
    }
    if (startDate) {
      conditions.push(gte(merchantDailyStat.statDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(merchantDailyStat.statDate, endDate));
    }

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

  /**
   * 检查今天是否已经统计过
   */
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
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
