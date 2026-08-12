import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { count, eq, ilike, and, desc, asc, isNull } from 'drizzle-orm';
import {
  product,
  productCategory,
  merchant,
  merchantCategory,
} from '@server/database/schema';
import type {
  AdminProduct,
  PaginatedResponse,
  ProductCategory,
} from '@shared/api.interface';

interface CreateCategoryDto {
  name: string;
  iconUrl: string;
  sortOrder: number;
}

interface UpdateCategoryDto {
  name: string;
  iconUrl: string;
  sortOrder: number;
  status: 'active' | 'inactive';
}

export interface ProductDetail extends AdminProduct {
  description: string;
  stock: number;
  merchantId: string;
  merchantName: string;
  categoryName: string;
}

@Injectable()
export class AdminProductService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  // ==== Categories ====

  async listCategories(): Promise<{ items: ProductCategory[] }> {
    const rows = await this.db
      .select({
        id: productCategory.id,
        name: productCategory.name,
        iconUrl: productCategory.iconUrl,
        sortOrder: productCategory.sortOrder,
        status: productCategory.status,
      })
      .from(productCategory)
      .orderBy(asc(productCategory.sortOrder));

    const items: ProductCategory[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      iconUrl: row.iconUrl,
      sortOrder: row.sortOrder,
      status: row.status,
    }));

    return { items };
  }

  async createCategory(dto: CreateCategoryDto): Promise<{ id: string }> {
    const result = await this.db
      .insert(productCategory)
      .values({
        name: dto.name,
        iconUrl: dto.iconUrl,
        sortOrder: dto.sortOrder,
      })
      .returning({ id: productCategory.id });

    return { id: result[0].id };
  }

  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<{ success: true }> {
    const result = await this.db
      .update(productCategory)
      .set({
        name: dto.name,
        iconUrl: dto.iconUrl,
        sortOrder: dto.sortOrder,
        status: dto.status,
      })
      .where(eq(productCategory.id, id))
      .returning({ id: productCategory.id });

    if (result.length === 0) {
      throw new NotFoundException('分类不存在');
    }

    return { success: true };
  }

  async deleteCategory(id: string): Promise<{ success: true }> {
    const result = await this.db
      .delete(productCategory)
      .where(eq(productCategory.id, id))
      .returning({ id: productCategory.id });

    if (result.length === 0) {
      throw new NotFoundException('分类不存在');
    }

    return { success: true };
  }

  // ==== Products ====

  async listProducts(
    page: number,
    pageSize: number,
    merchantId?: string,
    categoryId?: string,
    status: 'all' | 'on_sale' | 'off_sale' = 'all',
    keyword?: string,
  ): Promise<PaginatedResponse<AdminProduct>> {
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (merchantId) {
      conditions.push(eq(product.merchantId, merchantId));
    }
    if (categoryId) {
      conditions.push(eq(merchant.categoryId, categoryId));
    }
    if (status !== 'all') {
      conditions.push(eq(product.status, status));
    }
    if (keyword) {
      conditions.push(ilike(product.name, `%${keyword}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const baseQuery = this.db
      .select({
        id: product.id,
        name: product.name,
        mainImageUrl: product.mainImageUrl,
        merchantId: product.merchantId,
        merchantName: merchant.shopName,
        categoryName: merchantCategory.name,
        price: product.price,
        monthSales: product.monthSales,
        status: product.status,
        createdAt: product.createdAt,
      })
      .from(product)
      .leftJoin(merchant, eq(product.merchantId, merchant.id))
      .leftJoin(merchantCategory, eq(product.categoryId, merchantCategory.id));

    const [itemsResult, totalResult] = await Promise.all([
      baseQuery
        .where(whereClause)
        .orderBy(desc(product.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(product)
        .leftJoin(merchant, eq(product.merchantId, merchant.id))
        .where(whereClause),
    ]);

    const items: AdminProduct[] = itemsResult.map((row) => ({
      id: row.id,
      name: row.name,
      mainImageUrl: row.mainImageUrl,
      merchantId: row.merchantId,
      merchantName: row.merchantName ?? '',
      categoryName: row.categoryName ?? '',
      price: String(row.price),
      monthSales: row.monthSales,
      status: row.status as 'on_sale' | 'off_sale',
    }));

    return {
      items,
      total: Number(totalResult[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async forceOffShelf(id: string): Promise<{ success: true; status: string }> {
    const result = await this.db
      .update(product)
      .set({ status: 'off_sale' })
      .where(eq(product.id, id))
      .returning({ id: product.id, status: product.status });

    if (result.length === 0) {
      throw new NotFoundException('商品不存在');
    }

    return { success: true, status: result[0].status };
  }

  async getProductDetail(id: string): Promise<ProductDetail> {
    const rows = await this.db
      .select({
        id: product.id,
        name: product.name,
        mainImageUrl: product.mainImageUrl,
        description: product.description,
        stock: product.stock,
        merchantId: product.merchantId,
        merchantName: merchant.shopName,
        categoryName: merchantCategory.name,
        price: product.price,
        monthSales: product.monthSales,
        status: product.status,
      })
      .from(product)
      .leftJoin(merchant, eq(product.merchantId, merchant.id))
      .leftJoin(merchantCategory, eq(product.categoryId, merchantCategory.id))
      .where(eq(product.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('商品不存在');
    }

    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      mainImageUrl: row.mainImageUrl,
      description: row.description,
      stock: row.stock,
      merchantId: row.merchantId,
      merchantName: row.merchantName ?? '',
      categoryName: row.categoryName ?? '',
      price: String(row.price),
      monthSales: row.monthSales,
      status: row.status as 'on_sale' | 'off_sale',
    };
  }
}
