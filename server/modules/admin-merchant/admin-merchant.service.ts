import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { count, eq, ilike, and, desc } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { merchant } from '@server/database/schema';
import type { AdminMerchant, PaginatedResponse } from '@shared/api.interface';

interface CreateMerchantDto {
  account: string;
  password: string;
  shopName: string;
  contactName: string;
  contactPhone: string;
  address: string;
  categoryId?: string;
  deliveryFee: string;
  minOrderAmount: string;
}

interface UpdateMerchantDto {
  shopName?: string;
  contactName?: string;
  contactPhone?: string;
  address?: string;
  categoryId?: string;
  deliveryFee?: string;
  minOrderAmount?: string;
}

interface AuditMerchantDto {
  result: 'approved' | 'rejected';
  reason?: string;
}

type AuditStatus = 'all' | 'pending' | 'approved' | 'rejected';

@Injectable()
export class AdminMerchantService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async list(
    page: number,
    pageSize: number,
    keyword: string,
    auditStatus: AuditStatus,
  ): Promise<PaginatedResponse<AdminMerchant>> {
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (keyword) {
      conditions.push(ilike(merchant.shopName, `%${keyword}%`));
    }
    if (auditStatus !== 'all') {
      conditions.push(eq(merchant.auditStatus, auditStatus));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [itemsResult, totalResult] = await Promise.all([
      this.db
        .select({
          id: merchant.id,
          shopName: merchant.shopName,
          shopLogoUrl: merchant.shopLogoUrl,
          contactName: merchant.contactName,
          contactPhone: merchant.contactPhone,
          auditStatus: merchant.auditStatus,
          businessStatus: merchant.businessStatus,
          status: merchant.status,
          createdAt: merchant.createdAt,
        })
        .from(merchant)
        .where(whereClause)
        .orderBy(desc(merchant.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: count() }).from(merchant).where(whereClause),
    ]);

    const items: AdminMerchant[] = itemsResult.map((item) => ({
      id: item.id,
      shopName: item.shopName,
      shopLogoUrl: item.shopLogoUrl,
      contactName: item.contactName,
      contactPhone: item.contactPhone,
      auditStatus: item.auditStatus as 'pending' | 'approved' | 'rejected',
      businessStatus: item.businessStatus as 'open' | 'closed',
      status: item.status as 'active' | 'disabled',
      createdAt: item.createdAt.toISOString(),
    }));

    return {
      items,
      total: Number(totalResult[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async create(dto: CreateMerchantDto): Promise<{ id: string }> {
    const existing = await this.db
      .select({ id: merchant.id })
      .from(merchant)
      .where(eq(merchant.account, dto.account))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('商家账号已存在');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const result = await this.db
      .insert(merchant)
      .values({
        account: dto.account,
        password: hashedPassword,
        shopName: dto.shopName,
        shopLogoUrl: '',
        shopCoverUrl: '',
        shopDescription: '',
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        address: dto.address,
        categoryId: dto.categoryId ?? null,
        deliveryFee: dto.deliveryFee,
        minOrderAmount: dto.minOrderAmount,
        auditStatus: 'pending',
        auditReason: '',
      })
      .returning({ id: merchant.id });

    return { id: result[0].id };
  }

  async update(id: string, dto: UpdateMerchantDto): Promise<{ success: true }> {
    const updateData: Partial<typeof merchant.$inferInsert> = {};
    if (dto.shopName !== undefined) updateData.shopName = dto.shopName;
    if (dto.contactName !== undefined) updateData.contactName = dto.contactName;
    if (dto.contactPhone !== undefined) updateData.contactPhone = dto.contactPhone;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.categoryId !== undefined) updateData.categoryId = dto.categoryId || null;
    if (dto.deliveryFee !== undefined) updateData.deliveryFee = dto.deliveryFee;
    if (dto.minOrderAmount !== undefined) updateData.minOrderAmount = dto.minOrderAmount;

    if (Object.keys(updateData).length === 0) {
      return { success: true };
    }

    const result = await this.db
      .update(merchant)
      .set(updateData)
      .where(eq(merchant.id, id))
      .returning({ id: merchant.id });

    if (result.length === 0) {
      throw new NotFoundException('商家不存在');
    }

    return { success: true };
  }

  async audit(
    id: string,
    dto: AuditMerchantDto,
  ): Promise<{ success: true; auditStatus: string }> {
    const auditStatus = dto.result;
    const auditReason = dto.result === 'rejected' ? dto.reason ?? '' : '';

    const result = await this.db
      .update(merchant)
      .set({ auditStatus, auditReason })
      .where(eq(merchant.id, id))
      .returning({ id: merchant.id, auditStatus: merchant.auditStatus });

    if (result.length === 0) {
      throw new NotFoundException('商家不存在');
    }

    return { success: true, auditStatus: result[0].auditStatus };
  }

  async updateStatus(
    id: string,
    status: 'active' | 'disabled',
  ): Promise<{ success: true; status: string }> {
    const result = await this.db
      .update(merchant)
      .set({ status })
      .where(eq(merchant.id, id))
      .returning({ id: merchant.id, status: merchant.status });

    if (result.length === 0) {
      throw new NotFoundException('商家不存在');
    }

    return { success: true, status: result[0].status };
  }

  async remove(id: string): Promise<{ success: true }> {
    const result = await this.db
      .delete(merchant)
      .where(eq(merchant.id, id))
      .returning({ id: merchant.id });

    if (result.length === 0) {
      throw new NotFoundException('商家不存在');
    }

    return { success: true };
  }

  async updatePassword(id: string, newPassword: string): Promise<{ success: true }> {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('密码长度至少6位');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await this.db
      .update(merchant)
      .set({ password: hashedPassword })
      .where(eq(merchant.id, id))
      .returning({ id: merchant.id });
    if (result.length === 0) {
      throw new NotFoundException('商家不存在');
    }
    return { success: true };
  }
}
