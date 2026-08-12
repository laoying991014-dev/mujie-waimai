import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, sql, inArray, count } from 'drizzle-orm';
import type {
  OrderSummary,
  OrderDetail,
  OrderItem,
  PaginatedResponse,
} from '@shared/api.interface';
import {
  orderInfo,
  orderItem,
  cartItem,
  product,
  merchant,
  address,
} from '../../database/schema';

interface StatusTimelineNode {
  status: string;
  label: string;
  time: string;
}

const STATUS_FLOW = [
  'pending_payment',
  'pending_accept',
  'preparing',
  'delivering',
  'completed',
];

const STATUS_LABELS: Record<string, string> = {
  pending_payment: '待付款',
  pending_accept: '待接单',
  preparing: '制作中',
  delivering: '配送中',
  completed: '已完成',
  cancelled: '已取消',
};

@Injectable()
export class OrderService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private generateOrderNo(): string {
    const ts = Date.now().toString();
    const rand = Math.floor(100000 + Math.random() * 900000).toString();
    return `OD${ts}${rand}`;
  }

  async createOrder(
    userId: string,
    addressId: string,
    remark?: string,
  ): Promise<{ orderId: string; orderNo: string; status: string }> {
    // Get cart items with product info
    const cartRows = await this.db
      .select({
        id: cartItem.id,
        productId: cartItem.productId,
        merchantId: cartItem.merchantId,
        quantity: cartItem.quantity,
        productName: product.name,
        productImageUrl: product.mainImageUrl,
        price: product.price,
        stock: product.stock,
        status: product.status,
      })
      .from(cartItem)
      .innerJoin(product, eq(cartItem.productId, product.id))
      .where(eq(cartItem.userId, userId));

    if (cartRows.length === 0) {
      throw new BadRequestException('购物车为空');
    }

    const merchantId = cartRows[0].merchantId;

    // Validate all items are on sale and have enough stock
    for (const item of cartRows) {
      if (item.status !== 'on_sale') {
        throw new BadRequestException(`商品 ${item.productName} 已下架`);
      }
      if (item.stock < item.quantity) {
        throw new BadRequestException(`商品 ${item.productName} 库存不足`);
      }
    }

    // Get address
    const addrRows = await this.db
      .select({
        receiverName: address.receiverName,
        receiverPhone: address.receiverPhone,
        province: address.province,
        city: address.city,
        district: address.district,
        detailAddress: address.detailAddress,
      })
      .from(address)
      .where(and(eq(address.id, addressId), eq(address.userId, userId)))
      .limit(1);

    if (addrRows.length === 0) {
      throw new BadRequestException('地址不存在');
    }

    const addr = addrRows[0];
    const receiverAddress = `${addr.province}${addr.city}${addr.district}${addr.detailAddress}`;

    // Get merchant delivery fee
    const merchantRows = await this.db
      .select({ deliveryFee: merchant.deliveryFee })
      .from(merchant)
      .where(eq(merchant.id, merchantId))
      .limit(1);
    const deliveryFee = Number(merchantRows[0]?.deliveryFee ?? 0);

    // Calculate totals
    let productTotal = 0;
    for (const item of cartRows) {
      productTotal += Number(item.price) * item.quantity;
    }
    const totalAmount = productTotal + deliveryFee;

    const orderNo = this.generateOrderNo();

    // Use transaction
    const result = await this.db.transaction(async (tx) => {
      // Create order
      const inserted = await tx
        .insert(orderInfo)
        .values({
          orderNo,
          userId,
          merchantId,
          productTotal: productTotal.toFixed(2),
          deliveryFee: deliveryFee.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          receiverName: addr.receiverName,
          receiverPhone: addr.receiverPhone,
          receiverAddress,
          status: 'pending_accept',
          remark: remark || '',
          cancelReason: '',
        })
        .returning({ id: orderInfo.id, status: orderInfo.status });

      const orderId = inserted[0].id;

      // Create order items
      const orderItemValues = cartRows.map((item) => ({
        orderId,
        productId: item.productId,
        productName: item.productName,
        productImageUrl: item.productImageUrl,
        price: String(item.price),
        quantity: item.quantity,
        subtotal: (Number(item.price) * item.quantity).toFixed(2),
      }));
      await tx.insert(orderItem).values(orderItemValues);

      // Deduct stock
      for (const item of cartRows) {
        const updated = await tx
          .update(product)
          .set({ stock: sql`${product.stock} - ${item.quantity}` })
          .where(
            and(
              eq(product.id, item.productId),
              sql`${product.stock} >= ${item.quantity}`,
            ),
          )
          .returning({ id: product.id });
        if (updated.length === 0) {
          throw new BadRequestException(`商品 ${item.productName} 库存不足`);
        }
      }

      // Clear cart
      await tx.delete(cartItem).where(eq(cartItem.userId, userId));

      return { orderId, status: inserted[0].status };
    });

    return { orderId: result.orderId, orderNo, status: result.status };
  }

  async getOrders(
    userId: string,
    pageRaw: number,
    pageSizeRaw: number,
    statusFilter?: string,
  ): Promise<PaginatedResponse<OrderSummary>> {
    const page = Math.max(1, pageRaw);
    const pageSize = Math.max(1, Math.min(50, pageSizeRaw));
    const offset = (page - 1) * pageSize;

    let statuses: string[] | null = null;
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'in_progress') {
        statuses = ['pending_accept', 'preparing', 'delivering'];
      } else {
        statuses = [statusFilter];
      }
    }

    const baseWhere = [eq(orderInfo.userId, userId)];
    if (statuses) {
      baseWhere.push(inArray(orderInfo.status, statuses));
    }

    const [countRows, orderRows] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(orderInfo)
        .where(and(...baseWhere)),
      this.db
        .select({
          id: orderInfo.id,
          orderNo: orderInfo.orderNo,
          merchantId: orderInfo.merchantId,
          merchantName: merchant.shopName,
          merchantLogoUrl: merchant.shopLogoUrl,
          totalAmount: orderInfo.totalAmount,
          status: orderInfo.status,
          createdAt: orderInfo.createdAt,
        })
        .from(orderInfo)
        .innerJoin(merchant, eq(orderInfo.merchantId, merchant.id))
        .where(and(...baseWhere))
        .orderBy(desc(orderInfo.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = Number(countRows[0]?.count ?? 0);

    // Get first product image for each order
    const orderIds = orderRows.map((o) => o.id);
    let firstImages: Record<string, string> = {};
    if (orderIds.length > 0) {
      // Get first order item per order
      const itemRows = await this.db
        .select({
          orderId: orderItem.orderId,
          productImageUrl: orderItem.productImageUrl,
          id: orderItem.id,
        })
        .from(orderItem)
        .where(inArray(orderItem.orderId, orderIds))
        .orderBy(orderItem.id);

      const seen = new Set<string>();
      firstImages = {};
      for (const row of itemRows) {
        if (!seen.has(row.orderId)) {
          seen.add(row.orderId);
          firstImages[row.orderId] = row.productImageUrl;
        }
      }
    }

    // Get item counts
    let itemCounts: Record<string, number> = {};
    if (orderIds.length > 0) {
      const countRows2 = await this.db
        .select({
          orderId: orderItem.orderId,
          count: count(),
        })
        .from(orderItem)
        .where(inArray(orderItem.orderId, orderIds))
        .groupBy(orderItem.orderId);
      itemCounts = {};
      for (const row of countRows2) {
        itemCounts[row.orderId] = Number(row.count);
      }
    }

    const items: OrderSummary[] = orderRows.map((row) => ({
      id: row.id,
      orderNo: row.orderNo,
      merchantId: row.merchantId,
      merchantName: row.merchantName,
      merchantLogoUrl: row.merchantLogoUrl,
      totalAmount: String(row.totalAmount),
      status: row.status,
      itemCount: itemCounts[row.id] ?? 0,
      firstProductImageUrl: firstImages[row.id] ?? '',
      createdAt: new Date(row.createdAt).toISOString(),
    }));

    return { items, total, page, pageSize };
  }

  async getOrderDetail(userId: string, orderId: string): Promise<OrderDetail> {
    const orderRows = await this.db
      .select({
        id: orderInfo.id,
        orderNo: orderInfo.orderNo,
        merchantId: orderInfo.merchantId,
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
        merchantName: merchant.shopName,
        merchantLogoUrl: merchant.shopLogoUrl,
      })
      .from(orderInfo)
      .innerJoin(merchant, eq(orderInfo.merchantId, merchant.id))
      .where(eq(orderInfo.id, orderId))
      .limit(1);

    if (orderRows.length === 0) {
      throw new NotFoundException('订单不存在');
    }

    const order = orderRows[0];

    // Verify ownership
    const ownerCheck = await this.db
      .select({ userId: orderInfo.userId })
      .from(orderInfo)
      .where(eq(orderInfo.id, orderId))
      .limit(1);
    if (ownerCheck[0].userId !== userId) {
      throw new ForbiddenException('无权查看该订单');
    }

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
      .where(eq(orderItem.orderId, orderId));

    const items: OrderItem[] = itemRows.map((row) => ({
      id: row.id,
      productId: row.productId,
      productName: row.productName,
      productImageUrl: row.productImageUrl,
      price: String(row.price),
      quantity: row.quantity,
      subtotal: String(row.subtotal),
    }));

    // Build status timeline based on current status
    const statusTimeline = this.buildStatusTimeline(order.status, new Date(order.createdAt));

    return {
      id: order.id,
      orderNo: order.orderNo,
      merchantId: order.merchantId,
      merchantName: order.merchantName,
      merchantLogoUrl: order.merchantLogoUrl,
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
      createdAt: new Date(order.createdAt).toISOString(),
      statusTimeline,
    };
  }

  private buildStatusTimeline(currentStatus: string, createdAt: Date): { status: string; time: string }[] {
    const result: { status: string; time: string }[] = [];
    const currentIndex = STATUS_FLOW.indexOf(currentStatus);

    if (currentStatus === 'cancelled') {
      result.push({ status: 'pending_payment', time: createdAt.toISOString() });
      // Add cancelled with a slightly later time
      const cancelTime = new Date(createdAt.getTime() + 60000);
      result.push({ status: 'cancelled', time: cancelTime.toISOString() });
      return result;
    }

    for (let i = 0; i <= currentIndex; i++) {
      if (i >= 0 && i < STATUS_FLOW.length) {
        // Approximate times: each step a few minutes apart
        const stepTime = new Date(createdAt.getTime() + i * 15 * 60 * 1000);
        result.push({ status: STATUS_FLOW[i], time: stepTime.toISOString() });
      }
    }

    return result;
  }

  async cancelOrder(
    userId: string,
    orderId: string,
    reason: string,
  ): Promise<{ success: true; status: string }> {
    const orderRows = await this.db
      .select({ id: orderInfo.id, userId: orderInfo.userId, status: orderInfo.status })
      .from(orderInfo)
      .where(eq(orderInfo.id, orderId))
      .limit(1);

    if (orderRows.length === 0) {
      throw new NotFoundException('订单不存在');
    }

    if (orderRows[0].userId !== userId) {
      throw new ForbiddenException('无权操作该订单');
    }

    const currentStatus = orderRows[0].status;
    if (currentStatus !== 'pending_payment' && currentStatus !== 'pending_accept') {
      throw new BadRequestException('当前状态不可取消');
    }

    // Return stock
    const orderItemRows = await this.db
      .select({ productId: orderItem.productId, quantity: orderItem.quantity })
      .from(orderItem)
      .where(eq(orderItem.orderId, orderId));

    await this.db.transaction(async (tx) => {
      for (const item of orderItemRows) {
        await tx
          .update(product)
          .set({ stock: sql`${product.stock} + ${item.quantity}` })
          .where(eq(product.id, item.productId));
      }

      await tx
        .update(orderInfo)
        .set({ status: 'cancelled', cancelReason: reason })
        .where(eq(orderInfo.id, orderId));
    });

    return { success: true, status: 'cancelled' };
  }
}
