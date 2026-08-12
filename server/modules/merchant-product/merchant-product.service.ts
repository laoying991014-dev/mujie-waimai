import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  sql,
} from 'drizzle-orm';
import {
  merchantCategory,
  product,
} from '../../database/schema';
import type {
  MerchantCategory,
  MerchantProduct,
  PaginatedResponse,
} from '@shared/api.interface';

@Injectable()
export class MerchantProductService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  // ---- Categories ----

  async getCategories(
    merchantId: string,
  ): Promise<{ items: MerchantCategory[] }> {
    const rows = await this.db
      .select({
        id: merchantCategory.id,
        name: merchantCategory.name,
        sortOrder: merchantCategory.sortOrder,
      })
      .from(merchantCategory)
      .where(eq(merchantCategory.merchantId, merchantId))
      .orderBy(asc(merchantCategory.sortOrder), asc(merchantCategory.createdAt));

    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        sortOrder: row.sortOrder,
      })),
    };
  }

  async createCategory(
    merchantId: string,
    name: string,
    sortOrder: number,
  ): Promise<{ id: string }> {
    if (!name?.trim()) {
      throw new BadRequestException('分类名称不能为空');
    }
    const [created] = await this.db
      .insert(merchantCategory)
      .values({ merchantId, name: name.trim(), sortOrder })
      .returning({ id: merchantCategory.id });
    return { id: created.id };
  }

  async updateCategory(
    merchantId: string,
    id: string,
    name: string,
    sortOrder: number,
  ): Promise<{ success: true }> {
    if (!name?.trim()) {
      throw new BadRequestException('分类名称不能为空');
    }
    const existing = await this.ensureCategoryOwnership(merchantId, id);
    if (!existing) {
      throw new NotFoundException('分类不存在');
    }
    await this.db
      .update(merchantCategory)
      .set({ name: name.trim(), sortOrder })
      .where(eq(merchantCategory.id, id));
    return { success: true };
  }

  async deleteCategory(
    merchantId: string,
    id: string,
  ): Promise<{ success: true }> {
    const existing = await this.ensureCategoryOwnership(merchantId, id);
    if (!existing) {
      throw new NotFoundException('分类不存在');
    }
    // Unlink products from this category
    await this.db
      .update(product)
      .set({ categoryId: null })
      .where(
        and(
          eq(product.merchantId, merchantId),
          eq(product.categoryId, id),
        ),
      );
    await this.db.delete(merchantCategory).where(eq(merchantCategory.id, id));
    return { success: true };
  }

  private async ensureCategoryOwnership(
    merchantId: string,
    categoryId: string,
  ): Promise<boolean> {
    const rows = await this.db
      .select({ id: merchantCategory.id })
      .from(merchantCategory)
      .where(
        and(
          eq(merchantCategory.id, categoryId),
          eq(merchantCategory.merchantId, merchantId),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  // ---- Products ----

  async getProducts(
    merchantId: string,
    params: {
      page: number;
      pageSize: number;
      categoryId?: string;
      keyword?: string;
      status?: 'all' | 'on_sale' | 'off_sale';
    },
  ): Promise<PaginatedResponse<MerchantProduct>> {
    const { page, pageSize, categoryId, keyword, status } = params;
    const conditions = [eq(product.merchantId, merchantId)];

    if (categoryId) {
      conditions.push(eq(product.categoryId, categoryId));
    }
    if (keyword?.trim()) {
      conditions.push(ilike(product.name, `%${keyword.trim()}%`));
    }
    if (status && status !== 'all') {
      conditions.push(eq(product.status, status));
    }
    const where = and(...conditions);

    const [countRow] = await this.db
      .select({ count: count() })
      .from(product)
      .where(where);

    const rows = await this.db
      .select({
        id: product.id,
        name: product.name,
        mainImageUrl: product.mainImageUrl,
        price: product.price,
        stock: product.stock,
        monthSales: product.monthSales,
        status: product.status,
        categoryId: product.categoryId,
      })
      .from(product)
      .where(where)
      .orderBy(desc(product.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const categoryIds = rows
      .map((r) => r.categoryId)
      .filter((id): id is string => !!id);
    const uniqueCategoryIds = [...new Set(categoryIds)];
    const categoryMap = new Map<string, string>();
    if (uniqueCategoryIds.length > 0) {
      const catRows = await this.db
        .select({ id: merchantCategory.id, name: merchantCategory.name })
        .from(merchantCategory)
        .where(
          sql`${merchantCategory.id} = ANY(ARRAY[${sql.join(
            uniqueCategoryIds.map((id) => sql`${id}`),
            sql`, `,
          )}]::uuid[])`,
        );
      for (const c of catRows) {
        categoryMap.set(c.id, c.name);
      }
    }

    const items: MerchantProduct[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      mainImageUrl: row.mainImageUrl,
      categoryName: categoryMap.get(row.categoryId ?? '') ?? '',
      price: String(row.price),
      stock: row.stock,
      monthSales: row.monthSales,
      status: row.status as 'on_sale' | 'off_sale',
    }));

    return {
      items,
      total: Number(countRow.count),
      page,
      pageSize,
    };
  }

  async createProduct(
    merchantId: string,
    payload: {
      name: string;
      description: string;
      price: string;
      stock: number;
      categoryId?: string;
      mainImageUrl: string;
      status: 'on_sale' | 'off_sale';
    },
  ): Promise<{ id: string }> {
    if (!payload.name?.trim()) {
      throw new BadRequestException('商品名称不能为空');
    }
    if (!payload.mainImageUrl?.trim()) {
      throw new BadRequestException('请上传商品主图');
    }
    const priceNum = Number(payload.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      throw new BadRequestException('商品价格不合法');
    }
    if (payload.stock < 0) {
      throw new BadRequestException('库存不能为负');
    }
    if (payload.categoryId) {
      const hasCat = await this.ensureCategoryOwnership(
        merchantId,
        payload.categoryId,
      );
      if (!hasCat) {
        throw new ForbiddenException('所属分类不存在或不属于当前商家');
      }
    }

    const [created] = await this.db
      .insert(product)
      .values({
        merchantId,
        name: payload.name.trim(),
        description: payload.description ?? '',
        price: payload.price,
        stock: payload.stock,
        categoryId: payload.categoryId ?? null,
        mainImageUrl: payload.mainImageUrl,
        status: payload.status,
      })
      .returning({ id: product.id });
    return { id: created.id };
  }

  async updateProduct(
    merchantId: string,
    id: string,
    payload: {
      name: string;
      description: string;
      price: string;
      stock: number;
      categoryId?: string;
      mainImageUrl: string;
      status: 'on_sale' | 'off_sale';
    },
  ): Promise<{ success: true }> {
    await this.ensureProductOwnership(merchantId, id);
    if (!payload.name?.trim()) {
      throw new BadRequestException('商品名称不能为空');
    }
    const priceNum = Number(payload.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      throw new BadRequestException('商品价格不合法');
    }
    if (payload.stock < 0) {
      throw new BadRequestException('库存不能为负');
    }
    if (payload.categoryId) {
      const hasCat = await this.ensureCategoryOwnership(
        merchantId,
        payload.categoryId,
      );
      if (!hasCat) {
        throw new ForbiddenException('所属分类不存在或不属于当前商家');
      }
    }
    await this.db
      .update(product)
      .set({
        name: payload.name.trim(),
        description: payload.description ?? '',
        price: payload.price,
        stock: payload.stock,
        categoryId: payload.categoryId ?? null,
        mainImageUrl: payload.mainImageUrl,
        status: payload.status,
      })
      .where(eq(product.id, id));
    return { success: true };
  }

  async deleteProduct(
    merchantId: string,
    id: string,
  ): Promise<{ success: true }> {
    await this.ensureProductOwnership(merchantId, id);
    await this.db.delete(product).where(eq(product.id, id));
    return { success: true };
  }

  async updateProductStatus(
    merchantId: string,
    id: string,
    status: 'on_sale' | 'off_sale',
  ): Promise<{ success: true; status: 'on_sale' | 'off_sale' }> {
    await this.ensureProductOwnership(merchantId, id);
    await this.db.update(product).set({ status }).where(eq(product.id, id));
    return { success: true, status };
  }

  private async ensureProductOwnership(
    merchantId: string,
    productId: string,
  ): Promise<void> {
    const rows = await this.db
      .select({ id: product.id })
      .from(product)
      .where(
        and(eq(product.id, productId), eq(product.merchantId, merchantId)),
      )
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('商品不存在');
    }
  }
}
