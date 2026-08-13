import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { count, eq, sql, and, gte, lt } from 'drizzle-orm';
import { appUser, merchant, orderInfo } from '@server/database/schema';
import type { AdminOverview, AdminTrends, TrendItem } from '@shared/api.interface';

@Injectable()
export class AdminDashboardService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getOverview(): Promise<AdminOverview> {
    const [
      totalUsersResult,
      totalMerchantsResult,
      totalOrdersResult,
      totalRevenueResult,
      todayNewUsersResult,
      todayNewOrdersResult,
      todayRevenueResult,
      todayDeliveryFeeResult,
      pendingAuditsResult,
    ] = await Promise.all([
      this.db.select({ count: count() }).from(appUser),
      this.db.select({ count: count() }).from(merchant).where(eq(merchant.status, 'active')),
      this.db.select({ count: count() }).from(orderInfo),
      this.db
        .select({ sum: sql<number>`COALESCE(SUM(${orderInfo.totalAmount}), 0)`.as('sum') })
        .from(orderInfo)
        .where(sql`${orderInfo.status} != 'cancelled'`),
      this.db
        .select({ count: count() })
        .from(appUser)
        .where(sql`DATE(${appUser.createdAt}) = CURRENT_DATE`),
      this.db
        .select({ count: count() })
        .from(orderInfo)
        .where(sql`DATE(${orderInfo.createdAt}) = CURRENT_DATE`),
      this.db
        .select({ sum: sql<number>`COALESCE(SUM(${orderInfo.totalAmount}), 0)`.as('sum') })
        .from(orderInfo)
        .where(
          and(
            sql`DATE(${orderInfo.createdAt}) = CURRENT_DATE`,
            sql`${orderInfo.status} != 'cancelled'`,
          ),
        ),
      this.db
        .select({ sum: sql<number>`COALESCE(SUM(${orderInfo.deliveryFee}), 0)`.as('sum') })
        .from(orderInfo)
        .where(
          and(
            sql`DATE(${orderInfo.createdAt}) = CURRENT_DATE`,
            sql`${orderInfo.status} != 'cancelled'`,
          ),
        ),
      this.db.select({ count: count() }).from(merchant).where(eq(merchant.auditStatus, 'pending')),
    ]);

    return {
      totalUsers: Number(totalUsersResult[0]?.count ?? 0),
      totalMerchants: Number(totalMerchantsResult[0]?.count ?? 0),
      totalOrders: Number(totalOrdersResult[0]?.count ?? 0),
      totalRevenue: String(totalRevenueResult[0]?.sum ?? 0),
      todayNewUsers: Number(todayNewUsersResult[0]?.count ?? 0),
      todayNewOrders: Number(todayNewOrdersResult[0]?.count ?? 0),
      todayRevenue: String(todayRevenueResult[0]?.sum ?? 0),
      todayDeliveryFee: String(todayDeliveryFeeResult[0]?.sum ?? 0),
      pendingMerchantAudits: Number(pendingAuditsResult[0]?.count ?? 0),
    };
  }

  async getTrends(period: 'today' | 'week' | 'month'): Promise<AdminTrends> {
    const days = period === 'today' ? 1 : period === 'week' ? 7 : 30;

    // Generate date list
    const dates: string[] = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }

    const startDate = dates[0];
    const endDateObj = new Date(dates[dates.length - 1]);
    endDateObj.setDate(endDateObj.getDate() + 1);
    const endDate = endDateObj.toISOString().slice(0, 10);

    // Query order counts by date
    const orderRows = await this.db
      .select({
        date: sql<string>`DATE(${orderInfo.createdAt})`.as('date'),
        count: count(),
      })
      .from(orderInfo)
      .where(and(gte(orderInfo.createdAt, sql`${startDate}::date`), lt(orderInfo.createdAt, sql`${endDate}::date`)))
      .groupBy(sql`DATE(${orderInfo.createdAt})`)
      .orderBy(sql`DATE(${orderInfo.createdAt})`);

    // Query revenue by date
    const revenueRows = await this.db
      .select({
        date: sql<string>`DATE(${orderInfo.createdAt})`.as('date'),
        amount: sql<string>`COALESCE(SUM(${orderInfo.totalAmount}), 0)`.as('amount'),
      })
      .from(orderInfo)
      .where(
        and(
          gte(orderInfo.createdAt, sql`${startDate}::date`),
          lt(orderInfo.createdAt, sql`${endDate}::date`),
          sql`${orderInfo.status} != 'cancelled'`,
        ),
      )
      .groupBy(sql`DATE(${orderInfo.createdAt})`)
      .orderBy(sql`DATE(${orderInfo.createdAt})`);

    const orderMap = new Map<string, number>();
    for (const row of orderRows) {
      orderMap.set(String(row.date), Number(row.count));
    }

    const revenueMap = new Map<string, string>();
    for (const row of revenueRows) {
      revenueMap.set(String(row.date), String(row.amount));
    }

    const orderTrend: TrendItem[] = dates.map((date: string) => ({
      date,
      count: orderMap.get(date) ?? 0,
    }));

    const revenueTrend: TrendItem[] = dates.map((date: string) => ({
      date,
      amount: revenueMap.get(date) ?? '0',
    }));

    return { orderTrend, revenueTrend };
  }
}
