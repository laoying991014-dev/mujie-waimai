import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { sql, and, eq, count, desc, gte, lt, ne } from 'drizzle-orm';
import { orderInfo, orderItem } from '../../database/schema';
import type { DashboardStats, MerchantOrderItem } from '@shared/api.interface';

@Injectable()
export class MerchantDashboardService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getStats(merchantId: string): Promise<DashboardStats> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const [revenueRow] = await this.db
      .select({ total: sql<string>`COALESCE(SUM(${orderInfo.totalAmount}), 0)` })
      .from(orderInfo)
      .where(
        and(
          eq(orderInfo.merchantId, merchantId),
          gte(orderInfo.createdAt, todayStart),
          lt(orderInfo.createdAt, todayEnd),
          ne(orderInfo.status, 'cancelled'),
        ),
      );

    const [todayOrdersRow] = await this.db
      .select({ count: count() })
      .from(orderInfo)
      .where(
        and(
          eq(orderInfo.merchantId, merchantId),
          gte(orderInfo.createdAt, todayStart),
          lt(orderInfo.createdAt, todayEnd),
        ),
      );

    const [pendingOrdersRow] = await this.db
      .select({ count: count() })
      .from(orderInfo)
      .where(
        and(
          eq(orderInfo.merchantId, merchantId),
          eq(orderInfo.status, 'pending_accept'),
        ),
      );

    return {
      todayRevenue: revenueRow.total,
      todayOrders: Number(todayOrdersRow.count),
      pendingOrders: Number(pendingOrdersRow.count),
    };
  }

  async getPendingOrders(
    merchantId: string,
    limit: number,
  ): Promise<{ items: MerchantOrderItem[] }> {
    const orders = await this.db
      .select({
        id: orderInfo.id,
        orderNo: orderInfo.orderNo,
        userName: orderInfo.receiverName,
        userPhone: orderInfo.receiverPhone,
        totalAmount: orderInfo.totalAmount,
        status: orderInfo.status,
        createdAt: orderInfo.createdAt,
      })
      .from(orderInfo)
      .where(
        and(
          eq(orderInfo.merchantId, merchantId),
          eq(orderInfo.status, 'pending_accept'),
        ),
      )
      .orderBy(desc(orderInfo.createdAt))
      .limit(limit);

    const orderIds = orders.map((o) => o.id);
    let itemsByOrder: Map<string, number> = new Map();

    if (orderIds.length > 0) {
      const itemCounts = await this.db
        .select({
          orderId: orderItem.orderId,
          productCount: count(),
        })
        .from(orderItem)
        .where(sql`${orderItem.orderId} = ANY(ARRAY[${sql.join(orderIds.map((id) => sql`${id}`), sql`, `)}]::uuid[])`)
        .groupBy(orderItem.orderId);

      itemsByOrder = new Map(
        itemCounts.map((row) => [row.orderId, Number(row.productCount)]),
      );
    }

    const items: MerchantOrderItem[] = orders.map((order) => ({
      id: order.id,
      orderNo: order.orderNo,
      userName: order.userName,
      userPhone: order.userPhone,
      productCount: itemsByOrder.get(order.id) ?? 0,
      totalAmount: String(order.totalAmount),
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    }));

    return { items };
  }
}
