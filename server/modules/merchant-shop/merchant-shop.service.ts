import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq } from 'drizzle-orm';
import { merchant } from '../../database/schema';
import type { ShopSettings } from '@shared/api.interface';

interface SaveSettingsDto {
  shopName: string;
  shopLogoUrl: string;
  shopCoverUrl: string;
  shopDescription: string;
  businessStartTime: string;
  businessEndTime: string;
  minOrderAmount: string;
}

@Injectable()
export class MerchantShopService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getSettings(merchantId: string): Promise<ShopSettings> {
    const [row] = await this.db
      .select({
        shopName: merchant.shopName,
        shopLogoUrl: merchant.shopLogoUrl,
        shopCoverUrl: merchant.shopCoverUrl,
        shopDescription: merchant.shopDescription,
        businessStartTime: merchant.businessStartTime,
        businessEndTime: merchant.businessEndTime,
        deliveryFee: merchant.deliveryFee,
        minOrderAmount: merchant.minOrderAmount,
        businessStatus: merchant.businessStatus,
      })
      .from(merchant)
      .where(eq(merchant.id, merchantId));

    if (!row) {
      throw new NotFoundException('店铺不存在');
    }

    return {
      shopName: row.shopName,
      shopLogoUrl: row.shopLogoUrl,
      shopCoverUrl: row.shopCoverUrl,
      shopDescription: row.shopDescription,
      businessStartTime: row.businessStartTime,
      businessEndTime: row.businessEndTime,
      deliveryFee: String(row.deliveryFee),
      minOrderAmount: String(row.minOrderAmount),
      businessStatus: row.businessStatus as 'open' | 'closed',
    };
  }

  async saveSettings(
    merchantId: string,
    dto: SaveSettingsDto,
  ): Promise<{ success: boolean }> {
    const updated = await this.db
      .update(merchant)
      .set({
        shopName: dto.shopName,
        shopLogoUrl: dto.shopLogoUrl,
        shopCoverUrl: dto.shopCoverUrl,
        shopDescription: dto.shopDescription,
        businessStartTime: dto.businessStartTime,
        businessEndTime: dto.businessEndTime,
        minOrderAmount: dto.minOrderAmount,
      })
      .where(eq(merchant.id, merchantId))
      .returning({ id: merchant.id });

    if (updated.length === 0) {
      throw new NotFoundException('店铺不存在');
    }

    return { success: true };
  }

  async updateBusinessStatus(
    merchantId: string,
    status: 'open' | 'closed',
  ): Promise<{ success: boolean; status: string }> {
    const updated = await this.db
      .update(merchant)
      .set({ businessStatus: status })
      .where(eq(merchant.id, merchantId))
      .returning({ id: merchant.id, businessStatus: merchant.businessStatus });

    if (updated.length === 0) {
      throw new NotFoundException('店铺不存在');
    }

    return { success: true, status: updated[0].businessStatus };
  }
}
