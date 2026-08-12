import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, asc, ilike, count } from 'drizzle-orm';
import type {
  MerchantBrief,
  MerchantCategory,
  PaginatedResponse,
  ProductItem,
  ShopDetail,
} from '@shared/api.interface';
import {
  merchant,
  merchantCategory,
  product,
} from '../../database/schema';

type SortBy = 'default' | 'sales' | 'rating' | 'deliveryFee';

@Injectable()
export class MerchantPublicService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private mapMerchantBrief(row: {
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
      categoryId: row.categoryId ?? undefined,
    };
  }

  private mapShopDetail(row: {
    id: string;
    shopName: string;
    shopLogoUrl: string;
    shopCoverUrl: string;
    shopDescription: string;
    rating: string | number;
    monthSales: number;
    deliveryFee: string | number;
    minOrderAmount: string | number;
    businessStartTime: string;
    businessEndTime: string;
    businessStatus: string;
  }): ShopDetail {
    return {
      id: row.id,
      shopName: row.shopName,
      shopLogoUrl: row.shopLogoUrl,
      shopCoverUrl: row.shopCoverUrl,
      shopDescription: row.shopDescription,
      rating: Number(row.rating),
      monthSales: row.monthSales,
      deliveryFee: String(row.deliveryFee),
      minOrderAmount: String(row.minOrderAmount),
      businessStartTime: row.businessStartTime,
      businessEndTime: row.businessEndTime,
      businessStatus: row.businessStatus as 'open' | 'closed',
    };
  }

  async getMerchantList(
    pageRaw: number,
    pageSizeRaw: number,
    categoryId?: string,
    keyword?: string,
    sortBy: SortBy = 'default',
  ): Promise<PaginatedResponse<MerchantBrief>> {
    const page = Math.max(1, pageRaw);
    const pageSize = Math.max(1, Math.min(50, pageSizeRaw));
    const offset = (page - 1) * pageSize;

    const conditions = [
      eq(merchant.auditStatus, 'approved'),
      eq(merchant.status, 'active'),
    ];
    if (categoryId) {
      conditions.push(eq(merchant.categoryId, categoryId));
    }
    if (keyword) {
      conditions.push(ilike(merchant.shopName, `%${keyword}%`));
    }
    const where = and(...conditions);

    let orderClause;
    switch (sortBy) {
      case 'rating':
        orderClause = desc(merchant.rating);
        break;
      case 'deliveryFee':
        orderClause = asc(merchant.deliveryFee);
        break;
      case 'sales':
      case 'default':
      default:
        orderClause = desc(merchant.monthSales);
        break;
    }

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(merchant)
        .where(where),
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
        .where(where)
        .orderBy(orderClause)
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    return {
      items: rows.map((r) => this.mapMerchantBrief(r)),
      total,
      page,
      pageSize,
    };
  }

  async getShopDetail(id: string): Promise<ShopDetail> {
    const rows = await this.db
      .select({
        id: merchant.id,
        shopName: merchant.shopName,
        shopLogoUrl: merchant.shopLogoUrl,
        shopCoverUrl: merchant.shopCoverUrl,
        shopDescription: merchant.shopDescription,
        rating: merchant.rating,
        monthSales: merchant.monthSales,
        deliveryFee: merchant.deliveryFee,
        minOrderAmount: merchant.minOrderAmount,
        businessStartTime: merchant.businessStartTime,
        businessEndTime: merchant.businessEndTime,
        businessStatus: merchant.businessStatus,
      })
      .from(merchant)
      .where(
        and(
          eq(merchant.id, id),
          eq(merchant.auditStatus, 'approved'),
          eq(merchant.status, 'active'),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('店铺不存在或未通过审核');
    }

    return this.mapShopDetail(rows[0]);
  }

  async getShopProducts(
    id: string,
  ): Promise<{ categories: MerchantCategory[]; products: ProductItem[] }> {
    // Verify shop exists and is approved
    const shopRows = await this.db
      .select({ id: merchant.id })
      .from(merchant)
      .where(
        and(
          eq(merchant.id, id),
          eq(merchant.auditStatus, 'approved'),
          eq(merchant.status, 'active'),
        ),
      )
      .limit(1);

    if (shopRows.length === 0) {
      throw new NotFoundException('店铺不存在或未通过审核');
    }

    const [categoryRows, productRows] = await Promise.all([
      this.db
        .select({
          id: merchantCategory.id,
          name: merchantCategory.name,
          sortOrder: merchantCategory.sortOrder,
        })
        .from(merchantCategory)
        .where(eq(merchantCategory.merchantId, id))
        .orderBy(asc(merchantCategory.sortOrder)),
      this.db
        .select({
          id: product.id,
          categoryId: product.categoryId,
          name: product.name,
          description: product.description,
          price: product.price,
          stock: product.stock,
          monthSales: product.monthSales,
          mainImageUrl: product.mainImageUrl,
          status: product.status,
        })
        .from(product)
        .where(
          and(
            eq(product.merchantId, id),
            eq(product.status, 'on_sale'),
          ),
        )
        .orderBy(desc(product.monthSales)),
    ]);

    const products: ProductItem[] = productRows.map((r) => ({
      id: r.id,
      categoryId: r.categoryId ?? '',
      name: r.name,
      description: r.description,
      price: String(r.price),
      stock: r.stock,
      monthSales: r.monthSales,
      mainImageUrl: r.mainImageUrl,
      status: r.status as 'on_sale' | 'off_sale',
    }));

    return {
      categories: categoryRows,
      products,
    };
  }
}
