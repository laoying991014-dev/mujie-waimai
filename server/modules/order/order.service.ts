import { Inject, Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, sql, inArray, count } from 'drizzle-orm';
import type { OrderSummary, OrderDetail, OrderItem, PaginatedResponse } from '@shared/api.interface';
import { orderInfo, orderItem, cartItem, product, merchant, address } from '../../database/schema';

const STATUS_FLOW = ['pending_payment', 'payment_review', 'pending_accept', 'preparing', 'delivering', 'completed'];

@Injectable()
export class OrderService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private generateOrderNo(): string {
    const ts = Date.now().toString();
    const rand = Math.floor(100000 + Math.random() * 900000).toString();
    return `OD${ts}${rand}`;
  }

  async createOrder(userId: string, addressId: string, remark?: string): Promise<{ orderId: string; orderNo: string; status: string }> {
    const cartRows = await this.db.select({
      id: cartItem.id, productId: cartItem.productId, merchantId: cartItem.merchantId, quantity: cartItem.quantity,
      productName: product.name, productImageUrl: product.mainImageUrl, price: product.price, stock: product.stock, status: product.status,
    }).from(cartItem).innerJoin(product, eq(cartItem.productId, product.id)).where(eq(cartItem.userId, userId));
    if (cartRows.length === 0) throw new BadRequestException('购物车为空');
    const merchantId = cartRows[0].merchantId;
    for (const item of cartRows) {
      if (item.status !== 'on_sale') throw new BadRequestException(`商品 ${item.productName} 已下架`);
      if (item.stock < item.quantity) throw new BadRequestException(`商品 ${item.productName} 库存不足`);
    }

    const addrRows = await this.db.select({ receiverName: address.receiverName, receiverPhone: address.receiverPhone, province: address.province, city: address.city, district: address.district, detailAddress: address.detailAddress })
      .from(address).where(and(eq(address.id, addressId), eq(address.userId, userId))).limit(1);
    if (addrRows.length === 0) throw new BadRequestException('地址不存在');
    const addr = addrRows[0];
    const receiverAddress = `${addr.province}${addr.city}${addr.district}${addr.detailAddress}`;

    const merchantRows = await this.db.select({ deliveryFee: merchant.deliveryFee }).from(merchant).where(eq(merchant.id, merchantId)).limit(1);
    const deliveryFee = Number(merchantRows[0]?.deliveryFee ?? 0);
    let productTotal = 0;
    for (const item of cartRows) productTotal += Number(item.price) * item.quantity;
    const totalAmount = productTotal + deliveryFee;
    const orderNo = this.generateOrderNo();

    const result = await this.db.transaction(async (tx) => {
      const inserted = await tx.insert(orderInfo).values({
        orderNo, userId, merchantId, productTotal: productTotal.toFixed(2), deliveryFee: deliveryFee.toFixed(2), totalAmount: totalAmount.toFixed(2),
        receiverName: addr.receiverName, receiverPhone: addr.receiverPhone, receiverAddress, status: 'pending_payment', remark: remark || '', cancelReason: '',
      }).returning({ id: orderInfo.id, status: orderInfo.status });
      const orderId = inserted[0].id;
      await tx.insert(orderItem).values(cartRows.map((item) => ({ orderId, productId: item.productId, productName: item.productName, productImageUrl: item.productImageUrl, price: String(item.price), quantity: item.quantity, subtotal: (Number(item.price) * item.quantity).toFixed(2) })));
      for (const item of cartRows) {
        const updated = await tx.update(product).set({ stock: sql`${product.stock} - ${item.quantity}` }).where(and(eq(product.id, item.productId), sql`${product.stock} >= ${item.quantity}`)).returning({ id: product.id });
        if (updated.length === 0) throw new BadRequestException(`商品 ${item.productName} 库存不足`);
      }
      await tx.delete(cartItem).where(eq(cartItem.userId, userId));
      await tx.execute(sql`INSERT INTO order_payment (order_id) VALUES (${orderId}) ON CONFLICT (order_id) DO NOTHING`);
      return { orderId, status: inserted[0].status };
    });
    return { orderId: result.orderId, orderNo, status: result.status };
  }

  async createOrdersFromCart(userId: string, addressId: string, remark?: string): Promise<{ orders: { orderId: string; orderNo: string; merchantId: string; totalAmount: string; status: string }[] }> {
    const cartRows = await this.db.select({
      id: cartItem.id, productId: cartItem.productId, merchantId: cartItem.merchantId, quantity: cartItem.quantity,
      productName: product.name, productImageUrl: product.mainImageUrl, price: product.price, stock: product.stock, status: product.status,
    }).from(cartItem).innerJoin(product, eq(cartItem.productId, product.id)).where(eq(cartItem.userId, userId));
    if (cartRows.length === 0) throw new BadRequestException('购物车为空');

    const addrRows = await this.db.select({ receiverName: address.receiverName, receiverPhone: address.receiverPhone, province: address.province, city: address.city, district: address.district, detailAddress: address.detailAddress })
      .from(address).where(and(eq(address.id, addressId), eq(address.userId, userId))).limit(1);
    if (addrRows.length === 0) throw new BadRequestException('地址不存在');
    const addr = addrRows[0];
    const receiverAddress = `${addr.province}${addr.city}${addr.district}${addr.detailAddress}`;

    const groups = new Map<string, typeof cartRows>();
    for (const item of cartRows) {
      if (item.status !== 'on_sale') throw new BadRequestException(`商品 ${item.productName} 已下架`);
      if (item.stock < item.quantity) throw new BadRequestException(`商品 ${item.productName} 库存不足`);
      if (!groups.has(item.merchantId)) groups.set(item.merchantId, [] as any);
      groups.get(item.merchantId)!.push(item);
    }

    const result = await this.db.transaction(async (tx) => {
      const created: { orderId: string; orderNo: string; merchantId: string; totalAmount: string; status: string }[] = [];
      for (const [merchantId, merchantItems] of groups.entries()) {
        let productTotal = 0;
        for (const item of merchantItems) productTotal += Number(item.price) * item.quantity;
        const deliveryFee = 5000;
        const totalAmount = productTotal + deliveryFee;
        const orderNo = this.generateOrderNo();
        const inserted = await tx.insert(orderInfo).values({
          orderNo, userId, merchantId, productTotal: productTotal.toFixed(2), deliveryFee: deliveryFee.toFixed(2), totalAmount: totalAmount.toFixed(2),
          receiverName: addr.receiverName, receiverPhone: addr.receiverPhone, receiverAddress, status: 'pending_payment', remark: remark || '', cancelReason: '',
        }).returning({ id: orderInfo.id, status: orderInfo.status });
        const orderId = inserted[0].id;
        await tx.insert(orderItem).values(merchantItems.map((item) => ({ orderId, productId: item.productId, productName: item.productName, productImageUrl: item.productImageUrl, price: String(item.price), quantity: item.quantity, subtotal: (Number(item.price) * item.quantity).toFixed(2) })));
        for (const item of merchantItems) {
          const updated = await tx.update(product).set({ stock: sql`${product.stock} - ${item.quantity}` }).where(and(eq(product.id, item.productId), sql`${product.stock} >= ${item.quantity}`)).returning({ id: product.id });
          if (updated.length === 0) throw new BadRequestException(`商品 ${item.productName} 库存不足`);
        }
        await tx.execute(sql`INSERT INTO order_payment (order_id) VALUES (${orderId}) ON CONFLICT (order_id) DO NOTHING`);
        created.push({ orderId, orderNo, merchantId, totalAmount: totalAmount.toFixed(2), status: inserted[0].status });
      }
      await tx.delete(cartItem).where(eq(cartItem.userId, userId));
      return created;
    });
    return { orders: result };
  }

  async getOrders(userId: string, pageRaw: number, pageSizeRaw: number, statusFilter?: string): Promise<PaginatedResponse<OrderSummary>> {
    const page = Math.max(1, pageRaw); const pageSize = Math.max(1, Math.min(50, pageSizeRaw)); const offset = (page - 1) * pageSize;
    let statuses: string[] | null = null;
    if (statusFilter && statusFilter !== 'all') statuses = statusFilter === 'in_progress' ? ['pending_accept', 'preparing', 'delivering'] : [statusFilter];
    const baseWhere = [eq(orderInfo.userId, userId)]; if (statuses) baseWhere.push(inArray(orderInfo.status, statuses));
    const [countRows, orderRows] = await Promise.all([
      this.db.select({ count: count() }).from(orderInfo).where(and(...baseWhere)),
      this.db.select({ id: orderInfo.id, orderNo: orderInfo.orderNo, merchantId: orderInfo.merchantId, merchantName: merchant.shopName, merchantLogoUrl: merchant.shopLogoUrl, totalAmount: orderInfo.totalAmount, status: orderInfo.status, createdAt: orderInfo.createdAt }).from(orderInfo).innerJoin(merchant, eq(orderInfo.merchantId, merchant.id)).where(and(...baseWhere)).orderBy(desc(orderInfo.createdAt)).limit(pageSize).offset(offset),
    ]);
    const total = Number(countRows[0]?.count ?? 0);
    const orderIds = orderRows.map((o) => o.id);
    let firstImages: Record<string, string> = {};
    if (orderIds.length) {
      const rows = await this.db.select({ orderId: orderItem.orderId, productImageUrl: orderItem.productImageUrl, id: orderItem.id }).from(orderItem).where(inArray(orderItem.orderId, orderIds)).orderBy(orderItem.id);
      const seen = new Set<string>(); for (const row of rows) if (!seen.has(row.orderId)) { seen.add(row.orderId); firstImages[row.orderId] = row.productImageUrl; }
    }
    let itemCounts: Record<string, number> = {};
    if (orderIds.length) {
      const rows = await this.db.select({ orderId: orderItem.orderId, count: count() }).from(orderItem).where(inArray(orderItem.orderId, orderIds)).groupBy(orderItem.orderId);
      for (const row of rows) itemCounts[row.orderId] = Number(row.count);
    }
    const items = orderRows.map((row) => ({ id: row.id, orderNo: row.orderNo, merchantId: row.merchantId, merchantName: row.merchantName, merchantLogoUrl: row.merchantLogoUrl, totalAmount: String(row.totalAmount), status: row.status, itemCount: itemCounts[row.id] ?? 0, firstProductImageUrl: firstImages[row.id] ?? '', createdAt: new Date(row.createdAt).toISOString() }));
    return { items, total, page, pageSize };
  }

  async getOrderDetail(userId: string, orderId: string): Promise<OrderDetail> {
    const orderRows = await this.db.select({ id: orderInfo.id, orderNo: orderInfo.orderNo, merchantId: orderInfo.merchantId, productTotal: orderInfo.productTotal, deliveryFee: orderInfo.deliveryFee, totalAmount: orderInfo.totalAmount, receiverName: orderInfo.receiverName, receiverPhone: orderInfo.receiverPhone, receiverAddress: orderInfo.receiverAddress, status: orderInfo.status, cancelReason: orderInfo.cancelReason, remark: orderInfo.remark, createdAt: orderInfo.createdAt, merchantName: merchant.shopName, merchantLogoUrl: merchant.shopLogoUrl }).from(orderInfo).innerJoin(merchant, eq(orderInfo.merchantId, merchant.id)).where(eq(orderInfo.id, orderId)).limit(1);
    if (!orderRows.length) throw new NotFoundException('订单不存在');
    const order = orderRows[0];
    const ownerCheck = await this.db.select({ userId: orderInfo.userId }).from(orderInfo).where(eq(orderInfo.id, orderId)).limit(1);
    if (!ownerCheck[0] || ownerCheck[0].userId !== userId) throw new ForbiddenException('无权查看该订单');
    const itemRows = await this.db.select({ id: orderItem.id, productId: orderItem.productId, productName: orderItem.productName, productImageUrl: orderItem.productImageUrl, price: orderItem.price, quantity: orderItem.quantity, subtotal: orderItem.subtotal }).from(orderItem).where(eq(orderItem.orderId, orderId));
    const paymentRows: any[] = await this.db.execute(sql`SELECT last5, submitted_at, verified_at FROM order_payment WHERE order_id = ${orderId} LIMIT 1`);
    const payment = paymentRows[0];
    return {
      id: order.id, orderNo: order.orderNo, merchantId: order.merchantId, merchantName: order.merchantName, merchantLogoUrl: order.merchantLogoUrl,
      productTotal: String(order.productTotal), deliveryFee: String(order.deliveryFee), totalAmount: String(order.totalAmount), receiverName: order.receiverName,
      receiverPhone: order.receiverPhone, receiverAddress: order.receiverAddress, status: order.status, cancelReason: order.cancelReason || undefined,
      remark: order.remark || undefined, items: itemRows.map((row) => ({ id: row.id, productId: row.productId, productName: row.productName, productImageUrl: row.productImageUrl, price: String(row.price), quantity: row.quantity, subtotal: String(row.subtotal) })),
      createdAt: new Date(order.createdAt).toISOString(), statusTimeline: this.buildStatusTimeline(order.status, new Date(order.createdAt)),
      paymentLast5: payment?.last5 || undefined, paymentSubmittedAt: payment?.submitted_at ? new Date(payment.submitted_at).toISOString() : undefined,
      paymentVerifiedAt: payment?.verified_at ? new Date(payment.verified_at).toISOString() : undefined,
    };
  }

  async getPaymentInfo(userId: string, orderId: string) {
    const rows = await this.db.select({ id: orderInfo.id, orderNo: orderInfo.orderNo, totalAmount: orderInfo.totalAmount, status: orderInfo.status, userId: orderInfo.userId, merchantId: orderInfo.merchantId }).from(orderInfo).where(eq(orderInfo.id, orderId)).limit(1);
    if (!rows.length) throw new NotFoundException('订单不存在');
    if (rows[0].userId !== userId) throw new ForbiddenException('无权查看该订单');
    const merchantRows: any[] = await this.db.execute(sql`SELECT payment_recipient_name, payment_phone FROM merchant WHERE id = ${rows[0].merchantId} LIMIT 1`);
    const paymentRows: any[] = await this.db.execute(sql`SELECT last5, submitted_at, verified_at FROM order_payment WHERE order_id = ${orderId} LIMIT 1`);
    const p = paymentRows[0]; const m = merchantRows[0];
    return { orderId, orderNo: rows[0].orderNo, totalAmount: String(rows[0].totalAmount), status: rows[0].status, paymentRecipientName: m?.payment_recipient_name || '', paymentPhone: m?.payment_phone || '', paymentQrUrl: '', paymentLast5: p?.last5 || undefined, paymentSubmittedAt: p?.submitted_at ? new Date(p.submitted_at).toISOString() : undefined, paymentVerifiedAt: p?.verified_at ? new Date(p.verified_at).toISOString() : undefined };
  }

  async submitPayment(userId: string, orderId: string, last5: string) {
    if (!/^\d{5}$/.test(last5)) throw new BadRequestException('请输入交易详情后5位数字');
    const rows = await this.db.select({ id: orderInfo.id, userId: orderInfo.userId, status: orderInfo.status }).from(orderInfo).where(eq(orderInfo.id, orderId)).limit(1);
    if (!rows.length) throw new NotFoundException('订单不存在');
    if (rows[0].userId !== userId) throw new ForbiddenException('无权操作该订单');
    if (!['pending_payment', 'payment_review'].includes(rows[0].status)) throw new BadRequestException('当前订单无需提交付款信息');
    await this.db.execute(sql`INSERT INTO order_payment (order_id, last5, submitted_at, verified_at) VALUES (${orderId}, ${last5}, CURRENT_TIMESTAMP, NULL) ON CONFLICT (order_id) DO UPDATE SET last5 = EXCLUDED.last5, submitted_at = EXCLUDED.submitted_at, verified_at = NULL`);
    await this.db.update(orderInfo).set({ status: 'payment_review' }).where(eq(orderInfo.id, orderId));
    return { success: true, status: 'payment_review', paymentLast5: last5 };
  }

  private buildStatusTimeline(currentStatus: string, createdAt: Date): { status: string; time: string }[] {
    if (currentStatus === 'cancelled') return [{ status: 'cancelled', time: createdAt.toISOString() }];
    const currentIndex = STATUS_FLOW.indexOf(currentStatus);
    if (currentIndex < 0) return [{ status: currentStatus, time: createdAt.toISOString() }];
    return STATUS_FLOW.slice(0, currentIndex + 1).map((status, i) => ({ status, time: new Date(createdAt.getTime() + i * 15 * 60 * 1000).toISOString() }));
  }

  async cancelOrder(userId: string, orderId: string, reason: string): Promise<{ success: true; status: string }> {
    const orderRows = await this.db.select({ id: orderInfo.id, userId: orderInfo.userId, status: orderInfo.status }).from(orderInfo).where(eq(orderInfo.id, orderId)).limit(1);
    if (!orderRows.length) throw new NotFoundException('订单不存在');
    if (orderRows[0].userId !== userId) throw new ForbiddenException('无权操作该订单');
    if (!['pending_payment', 'payment_review', 'pending_accept'].includes(orderRows[0].status)) throw new BadRequestException('当前状态不可取消');
    const orderItemRows = await this.db.select({ productId: orderItem.productId, quantity: orderItem.quantity }).from(orderItem).where(eq(orderItem.orderId, orderId));
    await this.db.transaction(async (tx) => {
      for (const item of orderItemRows) await tx.update(product).set({ stock: sql`${product.stock} + ${item.quantity}` }).where(eq(product.id, item.productId));
      await tx.update(orderInfo).set({ status: 'cancelled', cancelReason: reason }).where(eq(orderInfo.id, orderId));
    });
    return { success: true, status: 'cancelled' };
  }
}
