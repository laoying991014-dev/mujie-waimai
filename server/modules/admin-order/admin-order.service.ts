import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { count, eq, ilike, and, desc, gte, lt, sql } from 'drizzle-orm';
import { orderInfo, orderItem, merchant, appUser } from '@server/database/schema';
import type { AdminOrder, AdminOrderDetail, OrderItem, PaginatedResponse } from '@shared/api.interface';

interface OrderListQuery { orderNo?: string; merchantId?: string; userId?: string; status?: string; startDate?: string; endDate?: string; }

@Injectable()
export class AdminOrderService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async list(page: number, pageSize: number, query: OrderListQuery): Promise<PaginatedResponse<AdminOrder>> {
    const offset = (page - 1) * pageSize; const conditions: any[] = [];
    if (query.orderNo) conditions.push(ilike(orderInfo.orderNo, `%${query.orderNo}%`));
    if (query.merchantId) conditions.push(eq(orderInfo.merchantId, query.merchantId));
    if (query.userId) conditions.push(eq(orderInfo.userId, query.userId));
    if (query.status) conditions.push(eq(orderInfo.status, query.status));
    if (query.startDate) conditions.push(gte(orderInfo.createdAt, sql`${query.startDate}::date`));
    if (query.endDate) { const d = new Date(query.endDate); d.setDate(d.getDate() + 1); conditions.push(lt(orderInfo.createdAt, sql`${d.toISOString().slice(0,10)}::date`)); }
    const whereClause = conditions.length ? and(...conditions) : undefined;
    const pc = this.db.select({ orderId: orderItem.orderId, productCount: sql<number>`SUM(${orderItem.quantity})`.as('product_count') }).from(orderItem).groupBy(orderItem.orderId).as('pc');
    const [rows, totalRows] = await Promise.all([
      this.db.select({ id: orderInfo.id, orderNo: orderInfo.orderNo, merchantName: merchant.shopName, userName: appUser.nickname, totalAmount: orderInfo.totalAmount, status: orderInfo.status, createdAt: orderInfo.createdAt, productCount: pc.productCount }).from(orderInfo).leftJoin(merchant, eq(orderInfo.merchantId, merchant.id)).leftJoin(appUser, eq(orderInfo.userId, appUser.id)).leftJoin(pc, eq(orderInfo.id, pc.orderId)).where(whereClause).orderBy(desc(orderInfo.createdAt)).limit(pageSize).offset(offset),
      this.db.select({ count: count() }).from(orderInfo).where(whereClause),
    ]);
    const ids = rows.map((r) => r.id); const payments: any[] = ids.length ? await this.db.execute(sql`SELECT order_id, last5, submitted_at FROM order_payment WHERE order_id = ANY(ARRAY[${sql.join(ids.map((id) => sql`${id}`), sql`, `)}]::uuid[])`) : [];
    const paymentMap = new Map(payments.map((p) => [p.order_id, p]));
    return { items: rows.map((r) => ({ id: r.id, orderNo: r.orderNo, merchantName: r.merchantName ?? '', userName: r.userName ?? '', productCount: Number(r.productCount ?? 0), totalAmount: String(r.totalAmount), status: r.status, createdAt: r.createdAt.toISOString(), paymentLast5: paymentMap.get(r.id)?.last5 || undefined })), total: Number(totalRows[0]?.count ?? 0), page, pageSize };
  }

  async getDetail(id: string): Promise<AdminOrderDetail> {
    const rows = await this.db.select({ id: orderInfo.id, orderNo: orderInfo.orderNo, merchantId: orderInfo.merchantId, merchantName: merchant.shopName, merchantPhone: merchant.contactPhone, merchantAddress: merchant.address, userId: orderInfo.userId, userName: appUser.nickname, userPhone: appUser.phone, productTotal: orderInfo.productTotal, deliveryFee: orderInfo.deliveryFee, totalAmount: orderInfo.totalAmount, receiverName: orderInfo.receiverName, receiverPhone: orderInfo.receiverPhone, receiverAddress: orderInfo.receiverAddress, status: orderInfo.status, cancelReason: orderInfo.cancelReason, remark: orderInfo.remark, createdAt: orderInfo.createdAt }).from(orderInfo).leftJoin(merchant, eq(orderInfo.merchantId, merchant.id)).leftJoin(appUser, eq(orderInfo.userId, appUser.id)).where(eq(orderInfo.id, id)).limit(1);
    if (!rows.length) throw new NotFoundException('订单不存在'); const order = rows[0];
    const itemRows = await this.db.select({ id: orderItem.id, productId: orderItem.productId, productName: orderItem.productName, productImageUrl: orderItem.productImageUrl, price: orderItem.price, quantity: orderItem.quantity, subtotal: orderItem.subtotal }).from(orderItem).where(eq(orderItem.orderId, id));
    const paymentRows: any[] = await this.db.execute(sql`SELECT last5, submitted_at, verified_at FROM order_payment WHERE order_id = ${id} LIMIT 1`); const p = paymentRows[0];
    return { id: order.id, orderNo: order.orderNo, merchantId: order.merchantId, merchantName: order.merchantName ?? '', merchantPhone: order.merchantPhone ?? '', merchantAddress: order.merchantAddress ?? '', userId: order.userId, userName: order.userName ?? '', userPhone: order.userPhone ?? '', productTotal: String(order.productTotal), deliveryFee: String(order.deliveryFee), totalAmount: String(order.totalAmount), receiverName: order.receiverName, receiverPhone: order.receiverPhone, receiverAddress: order.receiverAddress, status: order.status, cancelReason: order.cancelReason || undefined, remark: order.remark || undefined, items: itemRows.map((row) => ({ id: row.id, productId: row.productId, productName: row.productName, productImageUrl: row.productImageUrl, price: String(row.price), quantity: row.quantity, subtotal: String(row.subtotal) })), createdAt: order.createdAt.toISOString(), statusTimeline: this.buildStatusTimeline(order.status, order.createdAt.toISOString()), paymentLast5: p?.last5 || undefined, paymentSubmittedAt: p?.submitted_at ? new Date(p.submitted_at).toISOString() : undefined, paymentVerifiedAt: p?.verified_at ? new Date(p.verified_at).toISOString() : undefined };
  }

  async verifyPayment(id: string, received: boolean): Promise<{ success: true; status: string }> {
    const rows = await this.db.select({ status: orderInfo.status }).from(orderInfo).where(eq(orderInfo.id, id)).limit(1); if (!rows.length) throw new NotFoundException('订单不存在');
    if (rows[0].status !== 'payment_review') throw new BadRequestException('当前订单没有待核实付款');
    if (received) { await this.db.transaction(async (tx) => { await tx.execute(sql`UPDATE order_payment SET verified_at = CURRENT_TIMESTAMP WHERE order_id = ${id}`); await tx.update(orderInfo).set({ status: 'pending_accept' }).where(eq(orderInfo.id, id)); }); return { success: true, status: 'pending_accept' }; }
    await this.db.update(orderInfo).set({ status: 'pending_payment' }).where(eq(orderInfo.id, id)); return { success: true, status: 'pending_payment' };
  }

  async updateStatus(id: string, status: string): Promise<{ success: true; status: string }> {
    if (status === 'pending_accept') {
      const rows: any[] = await this.db.execute(sql`SELECT verified_at FROM order_payment WHERE order_id = ${id} LIMIT 1`);
      if (!rows[0]?.verified_at) throw new BadRequestException('请先确认付款到账');
    }
    const result = await this.db.update(orderInfo).set({ status }).where(eq(orderInfo.id, id)).returning({ id: orderInfo.id, status: orderInfo.status });
    if (!result.length) throw new NotFoundException('订单不存在'); return { success: true, status: result[0].status };
  }

  private buildStatusTimeline(currentStatus: string, createdAt: string): { status: string; time: string }[] {
    if (currentStatus === 'cancelled') return [{ status: 'cancelled', time: createdAt }];
    const flow = ['pending_payment', 'payment_review', 'pending_accept', 'preparing', 'delivering', 'completed']; const idx = flow.indexOf(currentStatus);
    if (idx < 0) return [{ status: currentStatus, time: createdAt }]; return flow.slice(0, idx + 1).map((status) => ({ status, time: createdAt }));
  }
}
