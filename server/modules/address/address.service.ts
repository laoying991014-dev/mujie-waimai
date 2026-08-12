import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { AddressItem } from '@shared/api.interface';
import { address } from '../../database/schema';

@Injectable()
export class AddressService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async getAddresses(userId: string): Promise<{ items: AddressItem[] }> {
    const rows = await this.db
      .select({
        id: address.id,
        receiverName: address.receiverName,
        receiverPhone: address.receiverPhone,
        province: address.province,
        city: address.city,
        district: address.district,
        detailAddress: address.detailAddress,
        isDefault: address.isDefault,
      })
      .from(address)
      .where(eq(address.userId, userId))
      .orderBy(desc(address.isDefault), desc(address.createdAt));

    return { items: rows };
  }

  async createAddress(
    userId: string,
    data: {
      receiverName: string;
      receiverPhone: string;
      province: string;
      city: string;
      district: string;
      detailAddress: string;
      isDefault?: boolean;
    },
  ): Promise<AddressItem> {
    const shouldDefault = !!data.isDefault;

    return this.db.transaction(async (tx) => {
      if (shouldDefault) {
        await tx
          .update(address)
          .set({ isDefault: false })
          .where(eq(address.userId, userId));
      }

      const inserted = await tx
        .insert(address)
        .values({
          userId,
          receiverName: data.receiverName,
          receiverPhone: data.receiverPhone,
          province: data.province,
          city: data.city,
          district: data.district,
          detailAddress: data.detailAddress,
          isDefault: shouldDefault,
        })
        .returning({
          id: address.id,
          receiverName: address.receiverName,
          receiverPhone: address.receiverPhone,
          province: address.province,
          city: address.city,
          district: address.district,
          detailAddress: address.detailAddress,
          isDefault: address.isDefault,
        });

      // If first address, set as default
      if (!shouldDefault) {
        const countRows = await tx
          .select({ count: sql<number>`count(*)` })
          .from(address)
          .where(eq(address.userId, userId));
        if (Number(countRows[0].count) === 1) {
          await tx
            .update(address)
            .set({ isDefault: true })
            .where(eq(address.id, inserted[0].id));
          inserted[0].isDefault = true;
        }
      }

      return inserted[0];
    });
  }

  async updateAddress(
    userId: string,
    addressId: string,
    data: {
      receiverName?: string;
      receiverPhone?: string;
      province?: string;
      city?: string;
      district?: string;
      detailAddress?: string;
      isDefault?: boolean;
    },
  ): Promise<AddressItem> {
    const existing = await this.db
      .select({ id: address.id })
      .from(address)
      .where(and(eq(address.id, addressId), eq(address.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('地址不存在');
    }

    return this.db.transaction(async (tx) => {
      if (data.isDefault) {
        await tx
          .update(address)
          .set({ isDefault: false })
          .where(eq(address.userId, userId));
      }

      const updateData: Record<string, any> = {};
      if (data.receiverName !== undefined) updateData.receiverName = data.receiverName;
      if (data.receiverPhone !== undefined) updateData.receiverPhone = data.receiverPhone;
      if (data.province !== undefined) updateData.province = data.province;
      if (data.city !== undefined) updateData.city = data.city;
      if (data.district !== undefined) updateData.district = data.district;
      if (data.detailAddress !== undefined) updateData.detailAddress = data.detailAddress;
      if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

      const updated = await tx
        .update(address)
        .set(updateData)
        .where(eq(address.id, addressId))
        .returning({
          id: address.id,
          receiverName: address.receiverName,
          receiverPhone: address.receiverPhone,
          province: address.province,
          city: address.city,
          district: address.district,
          detailAddress: address.detailAddress,
          isDefault: address.isDefault,
        });

      return updated[0];
    });
  }

  async deleteAddress(userId: string, addressId: string): Promise<{ success: true }> {
    const deleted = await this.db
      .delete(address)
      .where(and(eq(address.id, addressId), eq(address.userId, userId)))
      .returning({ id: address.id });

    if (deleted.length === 0) {
      throw new NotFoundException('地址不存在');
    }

    return { success: true };
  }

  async setDefault(userId: string, addressId: string): Promise<{ success: true }> {
    const existing = await this.db
      .select({ id: address.id })
      .from(address)
      .where(and(eq(address.id, addressId), eq(address.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('地址不存在');
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(address)
        .set({ isDefault: false })
        .where(eq(address.userId, userId));
      await tx
        .update(address)
        .set({ isDefault: true })
        .where(eq(address.id, addressId));
    });

    return { success: true };
  }
}
