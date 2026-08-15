import { BadRequestException, Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { sql, and, eq, count, desc } from 'drizzle-orm';
import { orderInfo, orderItem, product } from '../../database/schema';
import type { MerchantOrderItem, MerchantOrderDetail, OrderItem, PaginatedResponse, OrderStatus } from '@shared/api.interface';

const STATUS_FLOW: Record<string, string | null> = { pending_accept: 'preparing', preparing: 'delivering', delivering: 'completed', completed: null, cancelled: null };

@Injectable()
export class MerchantOrderService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async getOrderList(merchantId: string, page: number, pageSize: number, status?: string): Promise<PaginatedResponse<MerchantOrderItem>> {
    const conditions = [eq(orderInfo.merchantId, merchantId)];
    if (status && status !== 'all') conditions.push(eq(orderInfo.status, status));
    const [countRow] = await this.db.select({ count: count() }).from(orderInfo).where(and(...conditions));
    const total = Number(countRow.count); const offset = (page - 1) * pageSize;
    const orders = await this.db.select({ id: orderInfo.id, orderNo: orderInfo.orderNo, userName: orderInfo.receiverName, userPhone: orderInfo.receiverPhone, totalAmount: orderInfo.totalAmount, status: orderInfo.status, createdAt: orderInfo.createdAt }).from(orderInfo).where(and(...conditions)).orderBy(desc(orderInfo.createdAt)).limit(pageSize).offset(offset);
    const orderIds = orders.map((o) => o.id); let itemsByOrder = new Map<string, number>();
    if (orderIds.length) {
      const itemCounts = await this.db.select({ orderId: orderItem.orderId, productCount: sql<number>`SUM(${orderItem.quantity})` }).from(orderItem).where(sql`${orderItem.orderId} = ANY(ARRAY[${sql.join(orderIds.map((id) => sql`${id}`), sql`, `)}]::uuid[])`).groupBy(orderItem.orderId);
      itemsByOrder = new Map(itemCounts.map((row) => [row.orderId, Number(row.productCount)]));
    }
    const paymentRows: any[] = orderIds.length ? await this.db.execute(sql`SELECT order_id, last5, submitted_at FROM order_payment WHERE order_id = ANY(ARRAY[${sql.join(orderIds.map((id) => sql`${id}`), sql`, `)}]::uuid[])`) : [];
    const payments = new Map<string, any>(paymentRows.map((p) => [p.order_id, p]));
    const items: MerchantOrderItem[] = orders.map((order) => ({ id: order.id, orderNo: order.orderNo, userName: order.userName, userPhone: order.userPhone, productCount: itemsByOrder.get(order.id) ?? 0, totalAmount: String(order.totalAmount), status: order.status, createdAt: order.createdAt.toISOString(), paymentLast5: payments.get(order.id)?.last5 || undefined, paymentSubmittedAt: payments.get(order.id)?.submitted_at ? new Date(payments.get(order.id).submitted_at).toISOString() : undefined }));
    return { items, total, page, pageSize };
  }

  async getOrderDetail(merchantId: string, orderId: string): Promise<MerchantOrderDetail> {
    const orders = await this.db.select().from(orderInfo).where(eq(orderInfo.id, orderId)).limit(1);
    if (!orders.length) throw new NotFoundException('订单不存在');
    const order = orders[0]; if (order.merchantId !== merchantId) throw new ForbiddenException('无权查看此订单');
    const items = await this.db.select({ id: orderItem.id, productId: orderItem.productId, productName: orderItem.productName, productImageUrl: orderItem.productImageUrl, price: orderItem.price, quantity: orderItem.quantity, subtotal: orderItem.subtotal }).from(orderItem).where(eq(orderItem.orderId, orderId));
    const paymentRows: any[] = await this.db.execute(sql`SELECT last5, submitted_at, verified_at FROM order_payment WHERE order_id = ${orderId} LIMIT 1`); const p = paymentRows[0];
    return { id: order.id, orderNo: order.orderNo, productTotal: String(order.productTotal), deliveryFee: String(order.deliveryFee), totalAmount: String(order.totalAmount), receiverName: order.receiverName, receiverPhone: order.receiverPhone, receiverAddress: order.receiverAddress, status: order.status, cancelReason: order.cancelReason || undefined, remark: order.remark || undefined, items: items.map((item) => ({ id: item.id, productId: item.productId, productName: item.productName, productImageUrl: item.productImageUrl, price: String(item.price), quantity: item.quantity, subtotal: String(item.subtotal) })), createdAt: order.createdAt.toISOString(), paymentLast5: p?.last5 || undefined, paymentSubmittedAt: p?.submitted_at ? new Date(p.submitted_at).toISOString() : undefined, paymentVerifiedAt: p?.verified_at ? new Date(p.verified_at).toISOString() : undefined };
  }

  async verifyPayment(merchantId: string, orderId: string, received: boolean): Promise<{ success: true; status: string }> {
    const order = await this.validateOrderOwnership(merchantId, orderId);
    if (order.status !== 'payment_review') throw new BadRequestException('当前订单没有待核实付款');
    if (received) {
      await this.db.transaction(async (tx) => {
        await tx.execute(sql`UPDATE order_payment SET verified_at = CURRENT_TIMESTAMP WHERE order_id = ${orderId}`);
        await tx.update(orderInfo).set({ status: 'pending_accept' }).where(eq(orderInfo.id, orderId));
      });
      return { success: true, status: 'pending_accept' };
    }
    await this.db.update(orderInfo).set({ status: 'pending_payment' }).where(eq(orderInfo.id, orderId));
    return { success: true, status: 'pending_payment' };
  }

  async acceptOrder(merchantId: string, orderId: string): Promise<{ success: boolean; status: string }> {
    const order = await this.validateOrderOwnership(merchantId, orderId);
    if (order.status !== 'pending_accept') throw new BadRequestException('订单状态不正确，无法接单');
    const updated = await this.db.update(orderInfo).set({ status: 'preparing' }).where(eq(orderInfo.id, orderId)).returning({ status: orderInfo.status });
    if (!updated.length) throw new NotFoundException('订单不存在');
    return { success: true, status: 'preparing' };
  }

  async rejectOrder(merchantId: string, orderId: string, reason: string): Promise<{ success: boolean; status: string }> {
    const order = await this.validateOrderOwnership(merchantId, orderId);
    if (order.status !== 'pending_accept') throw new BadRequestException('订单状态不正确，无法拒单');
    if (!reason?.trim()) throw new BadRequestException('请填写拒单原因');
    await this.db.transaction(async (tx) => {
      const updated = await tx.update(orderInfo).set({ status: 'cancelled', cancelReason: reason }).where(eq(orderInfo.id, orderId)).returning({ id: orderInfo.id });
      if (!updated.length) throw new NotFoundException('订单不存在');
      const items = await tx.select({ productId: orderItem.productId, quantity: orderItem.quantity }).from(orderItem).where(eq(orderItem.orderId, orderId));
      for (const item of items) await tx.update(product).set({ stock: sql`${product.stock} + ${item.quantity}` }).where(eq(product.id, item.productId));
    });
    return { success: true, status: 'cancelled' };
  }

  async progressOrder(merchantId: string, orderId: string, targetStatus: OrderStatus): Promise<{ success: boolean; status: string }> {
    const order = await this.validateOrderOwnership(merchantId, orderId);
    const allowedTargets: OrderStatus[] = ['preparing', 'delivering', 'completed'];
    if (!allowedTargets.includes(targetStatus)) throw new BadRequestException('无效的目标状态');
    const nextStatus = STATUS_FLOW[order.status];
    if (!nextStatus || nextStatus !== targetStatus) throw new BadRequestException(`无法从「${order.status}」直接推进到「${targetStatus}」`);
    const updated = await this.db.update(orderInfo).set({ status: targetStatus }).where(eq(orderInfo.id, orderId)).returning({ status: orderInfo.status });
    if (!updated.length) throw new NotFoundException('订单不存在');
    return { success: true, status: targetStatus };
  }

  private async validateOrderOwnership(merchantId: string, orderId: string): Promise<{ id: string; merchantId: string; status: string }> {
    const order = await this.db.select({ id: orderInfo.id, merchantId: orderInfo.merchantId, status: orderInfo.status }).from(orderInfo).where(eq(orderInfo.id, orderId)).limit(1);
    if (!order.length) throw new NotFoundException('订单不存在');
    if (order[0].merchantId !== merchantId) throw new ForbiddenException('无权操作此订单');
    return order[0];
  }
}
