import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { count, eq, ilike, and, desc, gte, lt, sql } from 'drizzle-orm';
import {
  orderInfo,
  orderItem,
  merchant,
  appUser,
} from '@server/database/schema';
import type {
  AdminOrder,
  AdminOrderDetail,
  OrderItem,
  PaginatedResponse,
} from '@shared/api.interface';
import { ORDER_STATUS_LABELS } from '@shared/api.interface';

interface OrderListQuery {
  orderNo?: string;
  merchantId?: string;
  userId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class AdminOrderService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async list(
    page: number,
    pageSize: number,
    query: OrderListQuery,
  ): Promise<PaginatedResponse<AdminOrder>> {
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (query.orderNo) {
      conditions.push(ilike(orderInfo.orderNo, `%${query.orderNo}%`));
    }
    if (query.merchantId) {
      conditions.push(eq(orderInfo.merchantId, query.merchantId));
    }
    if (query.userId) {
      conditions.push(eq(orderInfo.userId, query.userId));
    }
    if (query.status) {
      conditions.push(eq(orderInfo.status, query.status));
    }
    if (query.startDate) {
      conditions.push(gte(orderInfo.createdAt, sql`${query.startDate}::date`));
    }
    if (query.endDate) {
      const endDateObj = new Date(query.endDate);
      endDateObj.setDate(endDateObj.getDate() + 1);
      const nextDay = endDateObj.toISOString().slice(0, 10);
      conditions.push(lt(orderInfo.createdAt, sql`${nextDay}::date`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Subquery for product count per order
    const productCountSubquery = this.db
      .select({
        orderId: orderItem.orderId,
        productCount: sql<number>`SUM(${orderItem.quantity})`.as(
          'product_count',
        ),
      })
      .from(orderItem)
      .groupBy(orderItem.orderId)
      .as('pc');

    const [itemsResult, totalResult] = await Promise.all([
      this.db
        .select({
          id: orderInfo.id,
          orderNo: orderInfo.orderNo,
          merchantName: merchant.shopName,
          userName: appUser.nickname,
          totalAmount: orderInfo.totalAmount,
          status: orderInfo.status,
          createdAt: orderInfo.createdAt,
          productCount: productCountSubquery.productCount,
        })
        .from(orderInfo)
        .leftJoin(merchant, eq(orderInfo.merchantId, merchant.id))
        .leftJoin(appUser, eq(orderInfo.userId, appUser.id))
        .leftJoin(
          productCountSubquery,
          eq(orderInfo.id, productCountSubquery.orderId),
        )
        .where(whereClause)
        .orderBy(desc(orderInfo.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: count() }).from(orderInfo).where(whereClause),
    ]);

    const items: AdminOrder[] = itemsResult.map((row) => ({
      id: row.id,
      orderNo: row.orderNo,
      merchantName: row.merchantName ?? '',
      userName: row.userName ?? '',
      productCount: Number(row.productCount ?? 0),
      totalAmount: String(row.totalAmount),
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    }));

    return {
      items,
      total: Number(totalResult[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async getDetail(id: string): Promise<AdminOrderDetail> {
    const orderRows = await this.db
      .select({
        id: orderInfo.id,
        orderNo: orderInfo.orderNo,
        merchantId: orderInfo.merchantId,
        merchantName: merchant.shopName,
        userId: orderInfo.userId,
        userName: appUser.nickname,
        userPhone: appUser.phone,
        productTotal: orderInfo.productTotal,
        deliveryFee: orderInfo.deliveryFee,
        totalAmount: orderInfo.totalAmount,
        receiverName: orderInfo.receiverName,
        receiverPhone: orderInfo.receiverPhone,
        receiverAddress: orderInfo.receiverAddress,
        status: orderInfo.status,
        cancelReason: orderInfo.cancelReason,
        remark: orderInfo.remark,
        createdAt: orderInfo.createdAt,
      })
      .from(orderInfo)
      .leftJoin(merchant, eq(orderInfo.merchantId, merchant.id))
      .leftJoin(appUser, eq(orderInfo.userId, appUser.id))
      .where(eq(orderInfo.id, id))
      .limit(1);

    if (orderRows.length === 0) {
      throw new NotFoundException('订单不存在');
    }

    const order = orderRows[0];

    const itemRows = await this.db
      .select({
        id: orderItem.id,
        productId: orderItem.productId,
        productName: orderItem.productName,
        productImageUrl: orderItem.productImageUrl,
        price: orderItem.price,
        quantity: orderItem.quantity,
        subtotal: orderItem.subtotal,
      })
      .from(orderItem)
      .where(eq(orderItem.orderId, id));

    const items: OrderItem[] = itemRows.map((row) => ({
      id: row.id,
      productId: row.productId,
      productName: row.productName,
      productImageUrl: row.productImageUrl,
      price: String(row.price),
      quantity: row.quantity,
      subtotal: String(row.subtotal),
    }));

    const statusTimeline = this.buildStatusTimeline(
      order.status,
      order.createdAt.toISOString(),
    );

    return {
      id: order.id,
      orderNo: order.orderNo,
      merchantId: order.merchantId,
      merchantName: order.merchantName ?? '',
      userId: order.userId,
      userName: order.userName ?? '',
      userPhone: order.userPhone ?? '',
      productTotal: String(order.productTotal),
      deliveryFee: String(order.deliveryFee),
      totalAmount: String(order.totalAmount),
      receiverName: order.receiverName,
      receiverPhone: order.receiverPhone,
      receiverAddress: order.receiverAddress,
      status: order.status,
      cancelReason: order.cancelReason || undefined,
      remark: order.remark || undefined,
      items,
      createdAt: order.createdAt.toISOString(),
      statusTimeline,
    };
  }

  async updateStatus(
    id: string,
    status: string,
  ): Promise<{ success: true; status: string }> {
    const result = await this.db
      .update(orderInfo)
      .set({ status })
      .where(eq(orderInfo.id, id))
      .returning({ id: orderInfo.id, status: orderInfo.status });

    if (result.length === 0) {
      throw new NotFoundException('订单不存在');
    }

    return { success: true, status: result[0].status };
  }

  private buildStatusTimeline(
    currentStatus: string,
    createdAt: string,
  ): { status: string; time: string }[] {
    const fullFlow = [
      'pending_payment',
      'pending_accept',
      'preparing',
      'delivering',
      'completed',
    ];

    if (currentStatus === 'cancelled') {
      return [{ status: 'cancelled', time: createdAt }];
    }

    const currentIndex = fullFlow.indexOf(currentStatus);
    if (currentIndex === -1) {
      return [{ status: currentStatus, time: createdAt }];
    }

    const timeline: { status: string; time: string }[] = [];
    for (let i = 0; i <= currentIndex; i++) {
      timeline.push({ status: fullFlow[i], time: createdAt });
    }

    return timeline;
  }
}
