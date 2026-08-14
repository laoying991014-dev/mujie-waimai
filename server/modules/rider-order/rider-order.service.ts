import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, sql, inArray, count } from 'drizzle-orm';
import { orderInfo, orderItem, merchant, rider } from '../../database/schema';

interface OrderSummary {
  id: string;
  orderNo: string;
  merchantId: string;
  merchantName: string;
  merchantLogoUrl: string;
  merchantAddress: string;
  merchantPhone: string;
  totalAmount: string;
  deliveryFee: string;
  status: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  remark: string;
  riderId?: string | null;
  riderAcceptedAt?: string | null;
  riderPickedUpAt?: string | null;
  riderDeliveredAt?: string | null;
  createdAt: string;
  itemCount: number;
}

@Injectable()
export class RiderOrderService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  // 获取待接单订单列表（骑手大厅）
  async getPendingOrders(page: number, pageSize: number): Promise<{ items: OrderSummary[]; total: number; page: number; pageSize: number }> {
    const offset = (page - 1) * pageSize;

    const [countRows, orderRows] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(orderInfo)
        .where(eq(orderInfo.status, 'pending_accept')),
      this.db
        .select({
          id: orderInfo.id,
          orderNo: orderInfo.orderNo,
          merchantId: orderInfo.merchantId,
          merchantName: merchant.shopName,
          merchantLogoUrl: merchant.shopLogoUrl,
          merchantAddress: merchant.address,
          merchantPhone: merchant.contactPhone,
          totalAmount: orderInfo.totalAmount,
          deliveryFee: orderInfo.deliveryFee,
          status: orderInfo.status,
          receiverName: orderInfo.receiverName,
          receiverPhone: orderInfo.receiverPhone,
          receiverAddress: orderInfo.receiverAddress,
          remark: orderInfo.remark,
          riderId: orderInfo.riderId,
          riderAcceptedAt: orderInfo.riderAcceptedAt,
          riderPickedUpAt: orderInfo.riderPickedUpAt,
          riderDeliveredAt: orderInfo.riderDeliveredAt,
          createdAt: orderInfo.createdAt,
        })
        .from(orderInfo)
        .innerJoin(merchant, eq(orderInfo.merchantId, merchant.id))
        .where(eq(orderInfo.status, 'pending_accept'))
        .orderBy(desc(orderInfo.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    const orderIds = orderRows.map((o) => o.id);

    // 获取每个订单的商品数量
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
      merchantAddress: row.merchantAddress,
      merchantPhone: row.merchantPhone,
      totalAmount: String(row.totalAmount),
      deliveryFee: String(row.deliveryFee),
      status: row.status,
      receiverName: row.receiverName,
      receiverPhone: row.receiverPhone,
      receiverAddress: row.receiverAddress,
      remark: row.remark || '',
      riderId: row.riderId,
      riderAcceptedAt: row.riderAcceptedAt ? new Date(row.riderAcceptedAt).toISOString() : null,
      riderPickedUpAt: row.riderPickedUpAt ? new Date(row.riderPickedUpAt).toISOString() : null,
      riderDeliveredAt: row.riderDeliveredAt ? new Date(row.riderDeliveredAt).toISOString() : null,
      createdAt: new Date(row.createdAt).toISOString(),
      itemCount: itemCounts[row.id] ?? 0,
    }));

    return { items, total, page, pageSize };
  }

  // 骑手抢单
  async acceptOrder(riderId: string, orderId: string): Promise<{ success: true; status: string }> {
    // 检查订单是否存在且状态为待接单
    const orderRows = await this.db
      .select({ id: orderInfo.id, status: orderInfo.status, riderId: orderInfo.riderId })
      .from(orderInfo)
      .where(eq(orderInfo.id, orderId))
      .limit(1);

    if (orderRows.length === 0) {
      throw new NotFoundException('订单不存在');
    }

    const order = orderRows[0];
    if (order.status !== 'pending_accept') {
      throw new BadRequestException('订单已被接单或状态异常');
    }
    if (order.riderId) {
      throw new BadRequestException('订单已被其他骑手抢走');
    }

    // 使用事务抢单，防止并发
    await this.db.transaction(async (tx) => {
      // 再次检查订单状态（乐观锁）
      const currentOrder = await tx
        .select({ status: orderInfo.status, riderId: orderInfo.riderId })
        .from(orderInfo)
        .where(eq(orderInfo.id, orderId))
        .limit(1);

      if (currentOrder[0].status !== 'pending_accept' || currentOrder[0].riderId) {
        throw new BadRequestException('手慢了，订单已被抢走');
      }

      // 更新订单状态为配送中（preparing表示商家制作中，骑手已接单）
      // 这里状态改为 preparing，表示骑手已接单，等待商家出餐
      await tx
        .update(orderInfo)
        .set({
          riderId,
          riderAcceptedAt: new Date(),
          status: 'preparing',
        })
        .where(eq(orderInfo.id, orderId));

      // 更新骑手当前订单数
      await tx
        .update(rider)
        .set({
          currentOrderCount: sql`${rider.currentOrderCount} + 1`,
          onlineStatus: 'busy',
        })
        .where(eq(rider.id, riderId));
    });

    return { success: true, status: 'preparing' };
  }

  // 骑手取餐
  async pickupOrder(riderId: string, orderId: string): Promise<{ success: true; status: string }> {
    const orderRows = await this.db
      .select({ id: orderInfo.id, status: orderInfo.status, riderId: orderInfo.riderId })
      .from(orderInfo)
      .where(eq(orderInfo.id, orderId))
      .limit(1);

    if (orderRows.length === 0) {
      throw new NotFoundException('订单不存在');
    }

    const order = orderRows[0];
    if (order.riderId !== riderId) {
      throw new ForbiddenException('无权操作该订单');
    }
    if (order.status !== 'preparing') {
      throw new BadRequestException('当前状态不可取餐');
    }

    await this.db
      .update(orderInfo)
      .set({
        status: 'delivering',
        riderPickedUpAt: new Date(),
      })
      .where(eq(orderInfo.id, orderId));

    return { success: true, status: 'delivering' };
  }

  // 骑手送达
  async deliverOrder(riderId: string, orderId: string): Promise<{ success: true; status: string }> {
    const orderRows = await this.db
      .select({
        id: orderInfo.id,
        status: orderInfo.status,
        riderId: orderInfo.riderId,
        deliveryFee: orderInfo.deliveryFee,
      })
      .from(orderInfo)
      .where(eq(orderInfo.id, orderId))
      .limit(1);

    if (orderRows.length === 0) {
      throw new NotFoundException('订单不存在');
    }

    const order = orderRows[0];
    if (order.riderId !== riderId) {
      throw new ForbiddenException('无权操作该订单');
    }
    if (order.status !== 'delivering') {
      throw new BadRequestException('当前状态不可确认送达');
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(orderInfo)
        .set({
          status: 'completed',
          riderDeliveredAt: new Date(),
        })
        .where(eq(orderInfo.id, orderId));

      // 更新骑手统计
      await tx
        .update(rider)
        .set({
          currentOrderCount: sql`${rider.currentOrderCount} - 1`,
          totalOrders: sql`${rider.totalOrders} + 1`,
          totalDeliveryFee: sql`${rider.totalDeliveryFee} + ${order.deliveryFee}`,
          onlineStatus: 'online',
        })
        .where(eq(rider.id, riderId));
    });

    return { success: true, status: 'completed' };
  }

  // 获取骑手订单列表
  async getRiderOrders(
    riderId: string,
    page: number,
    pageSize: number,
    statusFilter?: string,
  ): Promise<{ items: OrderSummary[]; total: number; page: number; pageSize: number }> {
    const offset = (page - 1) * pageSize;

    const baseWhere = [eq(orderInfo.riderId, riderId)];
    if (statusFilter && statusFilter !== 'all') {
      baseWhere.push(eq(orderInfo.status, statusFilter));
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
          merchantAddress: merchant.address,
          merchantPhone: merchant.contactPhone,
          totalAmount: orderInfo.totalAmount,
          deliveryFee: orderInfo.deliveryFee,
          status: orderInfo.status,
          receiverName: orderInfo.receiverName,
          receiverPhone: orderInfo.receiverPhone,
          receiverAddress: orderInfo.receiverAddress,
          remark: orderInfo.remark,
          riderId: orderInfo.riderId,
          riderAcceptedAt: orderInfo.riderAcceptedAt,
          riderPickedUpAt: orderInfo.riderPickedUpAt,
          riderDeliveredAt: orderInfo.riderDeliveredAt,
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
    const orderIds = orderRows.map((o) => o.id);

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
      merchantAddress: row.merchantAddress,
      merchantPhone: row.merchantPhone,
      totalAmount: String(row.totalAmount),
      deliveryFee: String(row.deliveryFee),
      status: row.status,
      receiverName: row.receiverName,
      receiverPhone: row.receiverPhone,
      receiverAddress: row.receiverAddress,
      remark: row.remark || '',
      riderId: row.riderId,
      riderAcceptedAt: row.riderAcceptedAt ? new Date(row.riderAcceptedAt).toISOString() : null,
      riderPickedUpAt: row.riderPickedUpAt ? new Date(row.riderPickedUpAt).toISOString() : null,
      riderDeliveredAt: row.riderDeliveredAt ? new Date(row.riderDeliveredAt).toISOString() : null,
      createdAt: new Date(row.createdAt).toISOString(),
      itemCount: itemCounts[row.id] ?? 0,
    }));

    return { items, total, page, pageSize };
  }

  // 获取订单详情
  async getOrderDetail(riderId: string, orderId: string): Promise<any> {
    const orderRows = await this.db
      .select({
        id: orderInfo.id,
        orderNo: orderInfo.orderNo,
        merchantId: orderInfo.merchantId,
        merchantName: merchant.shopName,
        merchantLogoUrl: merchant.shopLogoUrl,
        merchantAddress: merchant.address,
        merchantPhone: merchant.contactPhone,
        productTotal: orderInfo.productTotal,
        deliveryFee: orderInfo.deliveryFee,
        totalAmount: orderInfo.totalAmount,
        receiverName: orderInfo.receiverName,
        receiverPhone: orderInfo.receiverPhone,
        receiverAddress: orderInfo.receiverAddress,
        status: orderInfo.status,
        remark: orderInfo.remark,
        riderId: orderInfo.riderId,
        riderAcceptedAt: orderInfo.riderAcceptedAt,
        riderPickedUpAt: orderInfo.riderPickedUpAt,
        riderDeliveredAt: orderInfo.riderDeliveredAt,
        createdAt: orderInfo.createdAt,
      })
      .from(orderInfo)
      .innerJoin(merchant, eq(orderInfo.merchantId, merchant.id))
      .where(eq(orderInfo.id, orderId))
      .limit(1);

    if (orderRows.length === 0) {
      throw new NotFoundException('订单不存在');
    }

    const order = orderRows[0];
    if (order.riderId !== riderId) {
      throw new ForbiddenException('无权查看该订单');
    }

    const itemRows = await this.db
      .select({
        id: orderItem.id,
        productName: orderItem.productName,
        productImageUrl: orderItem.productImageUrl,
        price: orderItem.price,
        quantity: orderItem.quantity,
        subtotal: orderItem.subtotal,
      })
      .from(orderItem)
      .where(eq(orderItem.orderId, orderId));

    return {
      ...order,
      productTotal: String(order.productTotal),
      deliveryFee: String(order.deliveryFee),
      totalAmount: String(order.totalAmount),
      riderAcceptedAt: order.riderAcceptedAt ? new Date(order.riderAcceptedAt).toISOString() : null,
      riderPickedUpAt: order.riderPickedUpAt ? new Date(order.riderPickedUpAt).toISOString() : null,
      riderDeliveredAt: order.riderDeliveredAt ? new Date(order.riderDeliveredAt).toISOString() : null,
      createdAt: new Date(order.createdAt).toISOString(),
      items: itemRows.map((item) => ({
        ...item,
        price: String(item.price),
        subtotal: String(item.subtotal),
      })),
    };
  }

  // 更新骑手在线状态
  async updateOnlineStatus(riderId: string, onlineStatus: string): Promise<{ success: true }> {
    if (!['online', 'offline', 'busy'].includes(onlineStatus)) {
      throw new BadRequestException('无效的在线状态');
    }
    await this.db
      .update(rider)
      .set({ onlineStatus })
      .where(eq(rider.id, riderId));
    return { success: true };
  }

  // 获取骑手统计信息
  async getRiderStats(riderId: string): Promise<any> {
    const riderRows = await this.db
      .select({
        id: rider.id,
        name: rider.name,
        phone: rider.phone,
        avatarUrl: rider.avatarUrl,
        onlineStatus: rider.onlineStatus,
        currentOrderCount: rider.currentOrderCount,
        totalOrders: rider.totalOrders,
        totalDeliveryFee: rider.totalDeliveryFee,
        rating: rider.rating,
      })
      .from(rider)
      .where(eq(rider.id, riderId))
      .limit(1);

    if (riderRows.length === 0) {
      throw new NotFoundException('骑手不存在');
    }

    const r = riderRows[0];
    return {
      ...r,
      totalDeliveryFee: String(r.totalDeliveryFee),
      rating: String(r.rating),
    };
  }
}
