import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, asc, ilike } from 'drizzle-orm';
import type {
  BannerItem,
  CategoryItem,
  HotProductItem,
  MerchantBrief,
  NoticeItem,
} from '@shared/api.interface';
import {
  banner,
  notice,
  productCategory,
  merchant,
  product,
} from '../../database/schema';

@Injectable()
export class HomeService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async getCategories(): Promise<{ items: CategoryItem[] }> {
    const rows = await this.db
      .select({ id: productCategory.id, name: productCategory.name, iconUrl: productCategory.iconUrl })
      .from(productCategory)
      .where(eq(productCategory.status, 'active'))
      .orderBy(asc(productCategory.sortOrder));
    return { items: rows };
  }

  async getBanners(): Promise<{ items: BannerItem[] }> {
    const rows = await this.db
      .select({ id: banner.id, title: banner.title, imageUrl: banner.imageUrl, linkUrl: banner.linkUrl })
      .from(banner)
      .where(eq(banner.status, 'active'))
      .orderBy(asc(banner.sortOrder));
    return { items: rows };
  }

  async getNotices(): Promise<{ items: NoticeItem[] }> {
    const rows = await this.db
      .select({ id: notice.id, title: notice.title })
      .from(notice)
      .where(eq(notice.status, 'published'))
      .orderBy(asc(notice.sortOrder))
      .limit(5);
    return { items: rows };
  }

  private mapMerchant(row: {
    id: string;
    shopName: string;
    shopLogoUrl: string;
    shopCoverUrl: string;
    rating: string | number;
    monthSales: number;
    deliveryFee: string | number;
    minOrderAmount: string | number;
    businessStatus: string;
    categoryId?: string;
  }): MerchantBrief {
    return {
      id: row.id,
      shopName: row.shopName,
      shopLogoUrl: row.shopLogoUrl,
      shopCoverUrl: row.shopCoverUrl,
      rating: Number(row.rating),
      monthSales: row.monthSales,
      deliveryFee: String(row.deliveryFee),
      minOrderAmount: String(row.minOrderAmount),
      businessStatus: row.businessStatus as 'open' | 'closed',
      categoryId: row.categoryId,
    };
  }

  async getRecommendedMerchants(): Promise<{ items: MerchantBrief[] }> {
    const rows = await this.db
      .select({
        id: merchant.id,
        shopName: merchant.shopName,
        shopLogoUrl: merchant.shopLogoUrl,
        shopCoverUrl: merchant.shopCoverUrl,
        rating: merchant.rating,
        monthSales: merchant.monthSales,
        deliveryFee: merchant.deliveryFee,
        minOrderAmount: merchant.minOrderAmount,
        businessStatus: merchant.businessStatus,
        categoryId: merchant.categoryId,
      })
      .from(merchant)
      .where(and(eq(merchant.auditStatus, 'approved'), eq(merchant.status, 'active')))
      .orderBy(desc(merchant.rating))
      .limit(6);
    return { items: rows.map((r) => this.mapMerchant(r)) };
  }

  async getNearbyMerchants(limitRaw: number): Promise<{ items: MerchantBrief[] }> {
    const limit = Math.max(1, Math.min(50, limitRaw));
    const rows = await this.db
      .select({
        id: merchant.id,
        shopName: merchant.shopName,
        shopLogoUrl: merchant.shopLogoUrl,
        shopCoverUrl: merchant.shopCoverUrl,
        rating: merchant.rating,
        monthSales: merchant.monthSales,
        deliveryFee: merchant.deliveryFee,
        minOrderAmount: merchant.minOrderAmount,
        businessStatus: merchant.businessStatus,
        categoryId: merchant.categoryId,
      })
      .from(merchant)
      .where(and(eq(merchant.auditStatus, 'approved'), eq(merchant.status, 'active')))
      .orderBy(desc(merchant.monthSales))
      .limit(limit);
    return { items: rows.map((r) => this.mapMerchant(r)) };
  }

  async getHotProducts(limitRaw: number): Promise<{ items: HotProductItem[] }> {
    const limit = Math.max(1, Math.min(50, limitRaw));
    const rows = await this.db
      .select({
        id: product.id,
        name: product.name,
        mainImageUrl: product.mainImageUrl,
        price: product.price,
        monthSales: product.monthSales,
        merchantId: product.merchantId,
        merchantName: merchant.shopName,
      })
      .from(product)
      .innerJoin(merchant, eq(product.merchantId, merchant.id))
      .where(and(eq(product.status, 'on_sale'), eq(merchant.auditStatus, 'approved'), eq(merchant.status, 'active')))
      .orderBy(desc(product.monthSales))
      .limit(limit);
    return {
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        mainImageUrl: r.mainImageUrl,
        price: String(r.price),
        monthSales: r.monthSales,
        merchantId: r.merchantId,
        merchantName: r.merchantName,
      })),
    };
  }

  async search(keyword: string): Promise<{ merchants: MerchantBrief[]; products: HotProductItem[] }> {
    const pattern = `%${keyword}%`;
    const [merchantRows, productRows] = await Promise.all([
      this.db
        .select({
          id: merchant.id,
          shopName: merchant.shopName,
          shopLogoUrl: merchant.shopLogoUrl,
          shopCoverUrl: merchant.shopCoverUrl,
          rating: merchant.rating,
          monthSales: merchant.monthSales,
          deliveryFee: merchant.deliveryFee,
          minOrderAmount: merchant.minOrderAmount,
          businessStatus: merchant.businessStatus,
          categoryId: merchant.categoryId,
        })
        .from(merchant)
        .where(
          and(
            eq(merchant.auditStatus, 'approved'),
            eq(merchant.status, 'active'),
            ilike(merchant.shopName, pattern),
          ),
        )
        .orderBy(desc(merchant.monthSales))
        .limit(10),
      this.db
        .select({
          id: product.id,
          name: product.name,
          mainImageUrl: product.mainImageUrl,
          price: product.price,
          monthSales: product.monthSales,
          merchantId: product.merchantId,
          merchantName: merchant.shopName,
        })
        .from(product)
        .innerJoin(merchant, eq(product.merchantId, merchant.id))
        .where(
          and(
            eq(product.status, 'on_sale'),
            eq(merchant.auditStatus, 'approved'),
            eq(merchant.status, 'active'),
            ilike(product.name, pattern),
          ),
        )
        .orderBy(desc(product.monthSales))
        .limit(10),
    ]);
    return {
      merchants: merchantRows.map((r) => this.mapMerchant(r)),
      products: productRows.map((r) => ({
        id: r.id,
        name: r.name,
        mainImageUrl: r.mainImageUrl,
        price: String(r.price),
        monthSales: r.monthSales,
        merchantId: r.merchantId,
        merchantName: r.merchantName,
      })),
    };
  }
}
