import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { count, eq, ilike, and, desc, or, sql } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { appUser } from '@server/database/schema';
import type { AdminUser, PaginatedResponse } from '@shared/api.interface';

interface CreateUserDto {
  phone: string;
  password: string;
  nickname: string;
  avatarUrl?: string;
}

interface UpdateUserDto {
  nickname?: string;
  phone?: string;
  avatarUrl?: string;
}

@Injectable()
export class AdminUserService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async list(
    page: number,
    pageSize: number,
    keyword: string,
    status: 'all' | 'active' | 'disabled',
  ): Promise<PaginatedResponse<AdminUser>> {
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (keyword) {
      conditions.push(
        or(
          ilike(appUser.nickname, `%${keyword}%`),
          ilike(appUser.phone, `%${keyword}%`),
        ),
      );
    }
    if (status !== 'all') {
      conditions.push(eq(appUser.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [itemsResult, totalResult] = await Promise.all([
      this.db
        .select({
          id: appUser.id,
          nickname: appUser.nickname,
          avatarUrl: appUser.avatarUrl,
          phone: appUser.phone,
          status: appUser.status,
          createdAt: appUser.createdAt,
        })
        .from(appUser)
        .where(whereClause)
        .orderBy(desc(appUser.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: count() }).from(appUser).where(whereClause),
    ]);

    const items: AdminUser[] = itemsResult.map((item) => ({
      id: item.id,
      nickname: item.nickname,
      avatarUrl: item.avatarUrl,
      phone: item.phone,
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

  async create(dto: CreateUserDto): Promise<{ id: string }> {
    // Check duplicate phone
    const existing = await this.db
      .select({ id: appUser.id })
      .from(appUser)
      .where(eq(appUser.phone, dto.phone))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('手机号已存在');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const result = await this.db
      .insert(appUser)
      .values({
        phone: dto.phone,
        password: hashedPassword,
        nickname: dto.nickname,
        avatarUrl: dto.avatarUrl ?? '',
      })
      .returning({ id: appUser.id });

    return { id: result[0].id };
  }

  async update(id: string, dto: UpdateUserDto): Promise<{ success: true }> {
    const updateData: Partial<typeof appUser.$inferInsert> = {};
    if (dto.nickname !== undefined) updateData.nickname = dto.nickname;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.avatarUrl !== undefined) updateData.avatarUrl = dto.avatarUrl;

    if (Object.keys(updateData).length === 0) {
      return { success: true };
    }

    // Check duplicate phone if phone changed
    if (dto.phone) {
      const existing = await this.db
        .select({ id: appUser.id })
        .from(appUser)
        .where(and(eq(appUser.phone, dto.phone), sql`${appUser.id} != ${id}`))
        .limit(1);
      if (existing.length > 0) {
        throw new ConflictException('手机号已存在');
      }
    }

    const result = await this.db
      .update(appUser)
      .set(updateData)
      .where(eq(appUser.id, id))
      .returning({ id: appUser.id });

    if (result.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    return { success: true };
  }

  async updateStatus(id: string, status: 'active' | 'disabled'): Promise<{ success: true; status: string }> {
    const result = await this.db
      .update(appUser)
      .set({ status })
      .where(eq(appUser.id, id))
      .returning({ id: appUser.id, status: appUser.status });

    if (result.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    return { success: true, status: result[0].status };
  }

  async remove(id: string): Promise<{ success: true }> {
    const result = await this.db
      .delete(appUser)
      .where(eq(appUser.id, id))
      .returning({ id: appUser.id });

    if (result.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    return { success: true };
  }
}
