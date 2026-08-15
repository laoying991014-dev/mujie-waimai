import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, sql } from 'drizzle-orm';
import { merchant } from '../../database/schema';
import type { ShopSettings } from '@shared/api.interface';

interface SaveSettingsDto {
  shopName: string;
  shopLogoUrl: string;
  shopCoverUrl: string;
  shopDescription: string;
  businessStartTime: string;
  businessEndTime: string;
  paymentName: string;
  paymentPhone: string;
}

@Injectable()
export class MerchantShopService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  private async ensurePaymentSettingSchema(): Promise<void> {
    await this.db.execute(sql`CREATE TABLE IF NOT EXISTS payment_setting (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_phone varchar(20) NOT NULL DEFAULT '', payment_qr_url text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await this.db.execute(sql`ALTER TABLE payment_setting ADD COLUMN IF NOT EXISTS payment_name varchar(100) NOT NULL DEFAULT ''`);
    await this.db.execute(sql`ALTER TABLE payment_setting ADD COLUMN IF NOT EXISTS merchant_id uuid`);
    await this.db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS payment_setting_merchant_id_key ON payment_setting (merchant_id) WHERE merchant_id IS NOT NULL`);
  }

  async getSettings(merchantId: string): Promise<ShopSettings> {
    await this.ensurePaymentSettingSchema();
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

    const paymentRows: any[] = await this.db.execute(sql`SELECT payment_name, payment_phone FROM payment_setting WHERE merchant_id = ${merchantId} LIMIT 1`);
    const payment = paymentRows[0];

    return {
      shopName: row.shopName,
      shopLogoUrl: row.shopLogoUrl,
      shopCoverUrl: row.shopCoverUrl,
      shopDescription: row.shopDescription,
      businessStartTime: row.businessStartTime,
      businessEndTime: row.businessEndTime,
      deliveryFee: String(row.deliveryFee),
      minOrderAmount: String(row.minOrderAmount),
      paymentName: payment?.payment_name || '',
      paymentPhone: payment?.payment_phone || '',
      businessStatus: row.businessStatus as 'open' | 'closed',
    };
  }

  async saveSettings(
    merchantId: string,
    dto: SaveSettingsDto,
  ): Promise<{ success: boolean }> {
    await this.ensurePaymentSettingSchema();
    const updated = await this.db
      .update(merchant)
      .set({
        shopName: dto.shopName,
        shopLogoUrl: dto.shopLogoUrl,
        shopCoverUrl: dto.shopCoverUrl,
        shopDescription: dto.shopDescription,
        businessStartTime: dto.businessStartTime,
        businessEndTime: dto.businessEndTime,
      })
      .where(eq(merchant.id, merchantId))
      .returning({ id: merchant.id });

    if (updated.length === 0) {
      throw new NotFoundException('店铺不存在');
    }

    const paymentRows: any[] = await this.db.execute(sql`SELECT id FROM payment_setting WHERE merchant_id = ${merchantId} LIMIT 1`);
    if (!paymentRows.length) {
      await this.db.execute(sql`INSERT INTO payment_setting (payment_name, payment_phone, payment_qr_url, merchant_id) VALUES (${dto.paymentName || ''}, ${dto.paymentPhone || ''}, '', ${merchantId})`);
    } else {
      await this.db.execute(sql`UPDATE payment_setting SET payment_name = ${dto.paymentName || ''}, payment_phone = ${dto.paymentPhone || ''}, updated_at = CURRENT_TIMESTAMP WHERE id = ${paymentRows[0].id}`);
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
