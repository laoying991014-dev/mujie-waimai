import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { count, eq, ilike, and, or, desc } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { rider, orderInfo } from '@server/database/schema';
import type { PaginatedResponse } from '@shared/api.interface';

export interface AdminRider {
  id: string;
  account: string;
  name: string;
  phone: string;
  avatarUrl: string;
  idCard: string;
  status: 'active' | 'disabled';
  onlineStatus: 'online' | 'offline' | 'busy';
  currentOrderCount: number;
  totalOrders: number;
  totalDeliveryFee: string;
  rating: string;
  auditStatus: 'pending' | 'approved' | 'rejected';
  auditReason: string;
  createdAt: string;
}

export interface RiderStats {
  totalRiders: number;
  activeRiders: number;
  onlineRiders: number;
  totalOrders: number;
  totalDeliveryFee: string;
}

interface CreateRiderDto {
  account: string;
  password: string;
  name: string;
  phone: string;
  idCard?: string;
}

interface UpdateRiderDto {
  name?: string;
  phone?: string;
  idCard?: string;
}

type StatusFilter = 'all' | 'active' | 'disabled';
type AuditStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

@Injectable()
export class AdminRiderService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async list(
    page: number,
    pageSize: number,
    keyword: string,
    status: StatusFilter,
    auditStatus: AuditStatusFilter,
  ): Promise<PaginatedResponse<AdminRider>> {
    const offset = (page - 1) * pageSize;
    const conditions = [];
    if (keyword) {
      conditions.push(
        or(
          ilike(rider.name, `%${keyword}%`),
          ilike(rider.account, `%${keyword}%`),
          ilike(rider.phone, `%${keyword}%`),
        ),
      );
    }
    if (status !== 'all') {
      conditions.push(eq(rider.status, status));
    }
    if (auditStatus !== 'all') {
      conditions.push(eq(rider.auditStatus, auditStatus));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [itemsResult, totalResult] = await Promise.all([
      this.db
        .select()
        .from(rider)
        .where(whereClause)
        .orderBy(desc(rider.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: count() }).from(rider).where(whereClause),
    ]);

    const items: AdminRider[] = itemsResult.map((item) => ({
      id: item.id,
      account: item.account,
      name: item.name,
      phone: item.phone,
      avatarUrl: item.avatarUrl,
      idCard: item.idCard,
      status: item.status as 'active' | 'disabled',
      onlineStatus: item.onlineStatus as 'online' | 'offline' | 'busy',
      currentOrderCount: item.currentOrderCount,
      totalOrders: item.totalOrders,
      totalDeliveryFee: String(item.totalDeliveryFee),
      rating: String(item.rating),
      auditStatus: item.auditStatus as 'pending' | 'approved' | 'rejected',
      auditReason: item.auditReason,
      createdAt: new Date(item.createdAt).toISOString(),
    }));

    return {
      items,
      total: Number(totalResult[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async create(dto: CreateRiderDto): Promise<{ id: string }> {
    const existing = await this.db
      .select({ id: rider.id })
      .from(rider)
      .where(eq(rider.account, dto.account))
      .limit(1);
    if (existing.length > 0) {
      throw new ConflictException('骑手账号已存在');
    }
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const result = await this.db
      .insert(rider)
      .values({
        account: dto.account,
        password: hashedPassword,
        name: dto.name,
        phone: dto.phone,
        avatarUrl: '',
        idCard: dto.idCard ?? '',
        status: 'active',
        onlineStatus: 'offline',
        currentOrderCount: 0,
        totalOrders: 0,
        totalDeliveryFee: '0',
        rating: '5.0',
        auditStatus: 'approved',
        auditReason: '',
      })
      .returning({ id: rider.id });
    return { id: result[0].id };
  }

  async update(id: string, dto: UpdateRiderDto): Promise<{ success: true }> {
    const updateData: Partial<typeof rider.$inferInsert> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.idCard !== undefined) updateData.idCard = dto.idCard;
    if (Object.keys(updateData).length === 0) {
      return { success: true };
    }
    const result = await this.db
      .update(rider)
      .set(updateData)
      .where(eq(rider.id, id))
      .returning({ id: rider.id });
    if (result.length === 0) {
      throw new NotFoundException('骑手不存在');
    }
    return { success: true };
  }

  async updateStatus(
    id: string,
    status: 'active' | 'disabled',
  ): Promise<{ success: true; status: string }> {
    const result = await this.db
      .update(rider)
      .set({ status })
      .where(eq(rider.id, id))
      .returning({ id: rider.id, status: rider.status });
    if (result.length === 0) {
      throw new NotFoundException('骑手不存在');
    }
    return { success: true, status: result[0].status };
  }

  async audit(
    id: string,
    result: 'approved' | 'rejected',
    reason?: string,
  ): Promise<{ success: true; auditStatus: string }> {
    const auditReason = result === 'rejected' ? reason ?? '' : '';
    const res = await this.db
      .update(rider)
      .set({ auditStatus: result, auditReason })
      .where(eq(rider.id, id))
      .returning({ id: rider.id, auditStatus: rider.auditStatus });
    if (res.length === 0) {
      throw new NotFoundException('骑手不存在');
    }
    return { success: true, auditStatus: res[0].auditStatus };
  }

  async remove(id: string): Promise<{ success: true }> {
    const result = await this.db
      .delete(rider)
      .where(eq(rider.id, id))
      .returning({ id: rider.id });
    if (result.length === 0) {
      throw new NotFoundException('骑手不存在');
    }
    return { success: true };
  }

  async updatePassword(id: string, newPassword: string): Promise<{ success: true }> {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('密码长度至少6位');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await this.db
      .update(rider)
      .set({ password: hashedPassword })
      .where(eq(rider.id, id))
      .returning({ id: rider.id });
    if (result.length === 0) {
      throw new NotFoundException('骑手不存在');
    }
    return { success: true };
  }

  async getStats(): Promise<RiderStats> {
    const [totalResult, activeResult, onlineResult] = await Promise.all([
      this.db.select({ count: count() }).from(rider),
      this.db.select({ count: count() }).from(rider).where(eq(rider.status, 'active')),
      this.db.select({ count: count() }).from(rider).where(eq(rider.onlineStatus, 'online')),
    ]);

    // 计算总订单数和总配送费
    const orderStats = await this.db
      .select({
        totalOrders: count(),
      })
      .from(orderInfo)
      .where(eq(orderInfo.status, 'completed'));

    // 计算总配送费
    const feeResult = await this.db
      .select({ totalDeliveryFee: rider.totalDeliveryFee })
      .from(rider);
    const totalDeliveryFee = feeResult.reduce((sum, r) => sum + Number(r.totalDeliveryFee), 0);

    return {
      totalRiders: Number(totalResult[0]?.count ?? 0),
      activeRiders: Number(activeResult[0]?.count ?? 0),
      onlineRiders: Number(onlineResult[0]?.count ?? 0),
      totalOrders: Number(orderStats[0]?.count ?? 0),
      totalDeliveryFee: totalDeliveryFee.toFixed(2),
    };
  }

  async getRiderOrders(riderId: string, page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    const [itemsResult, totalResult] = await Promise.all([
      this.db
        .select()
        .from(orderInfo)
        .where(eq(orderInfo.riderId, riderId))
        .orderBy(desc(orderInfo.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: count() }).from(orderInfo).where(eq(orderInfo.riderId, riderId)),
    ]);

    return {
      items: itemsResult.map((item) => ({
        id: item.id,
        orderNo: item.orderNo,
        totalAmount: String(item.totalAmount),
        deliveryFee: String(item.deliveryFee),
        status: item.status,
        receiverName: item.receiverName,
        receiverPhone: item.receiverPhone,
        receiverAddress: item.receiverAddress,
        createdAt: new Date(item.createdAt).toISOString(),
      })),
      total: Number(totalResult[0]?.count ?? 0),
      page,
      pageSize,
    };
  }
}
