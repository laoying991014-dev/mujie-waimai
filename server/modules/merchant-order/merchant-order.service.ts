import { BadRequestException, Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { sql, and, eq, count, desc } from 'drizzle-orm';
import { orderInfo, orderItem, product } from '../../database/schema';
import type {
  MerchantOrderItem,
  MerchantOrderDetail,
  OrderItem,
  PaginatedResponse,
  OrderStatus,
} from '@shared/api.interface';

const STATUS_FLOW: Record<string, string | null> = {
  pending_accept: 'preparing',
  preparing: 'delivering',
  delivering: 'completed',
  completed: null,
  cancelled: null,
};

@Injectable()
export class MerchantOrderService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getOrderList(
    merchantId: string,
    page: number,
    pageSize: number,
    status?: string,
  ): Promise<PaginatedResponse<MerchantOrderItem>> {
    const conditions = [eq(orderInfo.merchantId, merchantId)];
    if (status && status !== 'all') {
      conditions.push(eq(orderInfo.status, status));
    }

    const [countRow] = await this.db
      .select({ count: count() })
      .from(orderInfo)
      .where(and(...conditions));

    const total = Number(countRow.count);
    const offset = (page - 1) * pageSize;

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
      .where(and(...conditions))
      .orderBy(desc(orderInfo.createdAt))
      .limit(pageSize)
      .offset(offset);

    const orderIds = orders.map((o) => o.id);
    let itemsByOrder: Map<string, number> = new Map();

    if (orderIds.length > 0) {
      const itemCounts = await this.db
        .select({
          orderId: orderItem.orderId,
          productCount: sql<number>`SUM(${orderItem.quantity})`,
        })
        .from(orderItem)
        .where(
          sql`${orderItem.orderId} = ANY(ARRAY[${sql.join(orderIds.map((id) => sql`${id}`), sql`, `)}]::uuid[])`,
        )
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

    return { items, total, page, pageSize };
  }

  async getOrderDetail(
    merchantId: string,
    orderId: string,
  ): Promise<MerchantOrderDetail> {
    const orders = await this.db
      .select()
      .from(orderInfo)
      .where(eq(orderInfo.id, orderId))
      .limit(1);

    if (orders.length === 0) {
      throw new NotFoundException('订单不存在');
    }

    const order = orders[0];

    if (order.merchantId !== merchantId) {
      throw new ForbiddenException('无权查看此订单');
    }

    const items = await this.db
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
      .where(eq(orderItem.orderId, orderId));

    const orderItems: OrderItem[] = items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productImageUrl: item.productImageUrl,
      price: String(item.price),
      quantity: item.quantity,
      subtotal: String(item.subtotal),
    }));

    return {
      id: order.id,
      orderNo: order.orderNo,
      productTotal: String(order.productTotal),
      deliveryFee: String(order.deliveryFee),
      totalAmount: String(order.totalAmount),
      receiverName: order.receiverName,
      receiverPhone: order.receiverPhone,
      receiverAddress: order.receiverAddress,
      status: order.status,
      cancelReason: order.cancelReason || undefined,
      remark: order.remark || undefined,
      items: orderItems,
      createdAt: order.createdAt.toISOString(),
    };
  }

  async acceptOrder(
    merchantId: string,
    orderId: string,
  ): Promise<{ success: boolean; status: string }> {
    const order = await this.validateOrderOwnership(merchantId, orderId);

    if (order.status !== 'pending_accept') {
      throw new BadRequestException('订单状态不正确，无法接单');
    }

    const updated = await this.db
      .update(orderInfo)
      .set({ status: 'preparing' })
      .where(eq(orderInfo.id, orderId))
      .returning({ status: orderInfo.status });

    if (updated.length === 0) {
      throw new NotFoundException('订单不存在');
    }

    return { success: true, status: 'preparing' };
  }

  async rejectOrder(
    merchantId: string,
    orderId: string,
    reason: string,
  ): Promise<{ success: boolean; status: string }> {
    const order = await this.validateOrderOwnership(merchantId, orderId);

    if (order.status !== 'pending_accept') {
      throw new BadRequestException('订单状态不正确，无法拒单');
    }

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('请填写拒单原因');
    }

    await this.db.transaction(async (tx) => {
      const updated = await tx
        .update(orderInfo)
        .set({ status: 'cancelled', cancelReason: reason })
        .where(eq(orderInfo.id, orderId))
        .returning({ id: orderInfo.id });

      if (updated.length === 0) {
        throw new NotFoundException('订单不存在');
      }

      // 返还库存
      const items = await tx
        .select({
          productId: orderItem.productId,
          quantity: orderItem.quantity,
        })
        .from(orderItem)
        .where(eq(orderItem.orderId, orderId));

      for (const item of items) {
        await tx
          .update(product)
          .set({ stock: sql`${product.stock} + ${item.quantity}` })
          .where(eq(product.id, item.productId));
      }
    });

    return { success: true, status: 'cancelled' };
  }

  async progressOrder(
    merchantId: string,
    orderId: string,
    targetStatus: OrderStatus,
  ): Promise<{ success: boolean; status: string }> {
    const order = await this.validateOrderOwnership(merchantId, orderId);

    const allowedTargets: OrderStatus[] = ['preparing', 'delivering', 'completed'];
    if (!allowedTargets.includes(targetStatus)) {
      throw new BadRequestException('无效的目标状态');
    }

    const nextStatus = STATUS_FLOW[order.status];
    if (!nextStatus || nextStatus !== targetStatus) {
      throw new BadRequestException(
        `无法从「${order.status}」直接推进到「${targetStatus}」`,
      );
    }

    const updated = await this.db
      .update(orderInfo)
      .set({ status: targetStatus })
      .where(eq(orderInfo.id, orderId))
      .returning({ status: orderInfo.status });

    if (updated.length === 0) {
      throw new NotFoundException('订单不存在');
    }

    return { success: true, status: targetStatus };
  }

  private async validateOrderOwnership(
    merchantId: string,
    orderId: string,
  ): Promise<{ id: string; merchantId: string; status: string }> {
    const order = await this.db
      .select({
        id: orderInfo.id,
        merchantId: orderInfo.merchantId,
        status: orderInfo.status,
      })
      .from(orderInfo)
      .where(eq(orderInfo.id, orderId))
      .limit(1);

    if (order.length === 0) {
      throw new NotFoundException('订单不存在');
    }

    if (order[0].merchantId !== merchantId) {
      throw new ForbiddenException('无权操作此订单');
    }

    return order[0];
  }
}
