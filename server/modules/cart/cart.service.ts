import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, sql } from 'drizzle-orm';
import type { CartInfo, CartItem } from '@shared/api.interface';
import { cartItem, product, merchant } from '../../database/schema';

@Injectable()
export class CartService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async getCart(userId: string): Promise<CartInfo> {
    const rows = await this.db
      .select({
        id: cartItem.id,
        productId: cartItem.productId,
        productName: product.name,
        productImageUrl: product.mainImageUrl,
        price: product.price,
        quantity: cartItem.quantity,
        merchantId: cartItem.merchantId,
      })
      .from(cartItem)
      .innerJoin(product, eq(cartItem.productId, product.id))
      .where(eq(cartItem.userId, userId));

    if (rows.length === 0) {
      return { merchantId: '', merchantName: '', deliveryFee: '0', items: [], productTotal: '0' };
    }

    const merchantId: string = rows[0].merchantId;
    const merchantRow = await this.db
      .select({ shopName: merchant.shopName, deliveryFee: merchant.deliveryFee })
      .from(merchant)
      .where(eq(merchant.id, merchantId))
      .limit(1);

    const merchantName = merchantRow[0]?.shopName ?? '';
    const deliveryFee = String(merchantRow[0]?.deliveryFee ?? '0');

    const items: CartItem[] = rows.map((row) => {
      const price = String(row.price);
      const subtotal = (Number(price) * Number(row.quantity)).toFixed(2);
      return {
        id: row.id,
        productId: row.productId,
        productName: row.productName,
        productImageUrl: row.productImageUrl,
        price,
        quantity: row.quantity,
        subtotal,
      };
    });

    const productTotal = items
      .reduce((sum: number, item: CartItem) => sum + Number(item.subtotal), 0)
      .toFixed(2);

    return { merchantId, merchantName, deliveryFee, items, productTotal };
  }

  async addItem(userId: string, productId: string, quantity: number): Promise<{ id: string; quantity: number }> {
    if (quantity <= 0) {
      throw new BadRequestException('数量必须大于0');
    }

    const productRows = await this.db
      .select({ id: product.id, merchantId: product.merchantId, status: product.status, stock: product.stock })
      .from(product)
      .where(eq(product.id, productId))
      .limit(1);

    if (productRows.length === 0) {
      throw new NotFoundException('商品不存在');
    }

    const prod = productRows[0];
    if (prod.status !== 'on_sale') {
      throw new BadRequestException('商品已下架');
    }

    // Check merchant consistency
    const existingRows = await this.db
      .select({ merchantId: cartItem.merchantId })
      .from(cartItem)
      .where(eq(cartItem.userId, userId))
      .limit(1);

    const currentMerchantId = existingRows[0]?.merchantId;
    if (currentMerchantId && currentMerchantId !== prod.merchantId) {
      // Clear old merchant's cart
      await this.db.delete(cartItem).where(eq(cartItem.userId, userId));
    }

    // Check if item already in cart
    const existingItem = await this.db
      .select({ id: cartItem.id, quantity: cartItem.quantity })
      .from(cartItem)
      .where(and(eq(cartItem.userId, userId), eq(cartItem.productId, productId)))
      .limit(1);

    if (existingItem.length > 0) {
      const newQty = existingItem[0].quantity + quantity;
      if (newQty > prod.stock) {
        throw new BadRequestException('库存不足');
      }
      const updated = await this.db
        .update(cartItem)
        .set({ quantity: newQty })
        .where(eq(cartItem.id, existingItem[0].id))
        .returning({ id: cartItem.id, quantity: cartItem.quantity });
      return { id: updated[0].id, quantity: updated[0].quantity };
    }

    if (quantity > prod.stock) {
      throw new BadRequestException('库存不足');
    }

    const inserted = await this.db
      .insert(cartItem)
      .values({ userId, productId, merchantId: prod.merchantId, quantity })
      .returning({ id: cartItem.id, quantity: cartItem.quantity });

    return { id: inserted[0].id, quantity: inserted[0].quantity };
  }

  async updateQuantity(
    userId: string,
    itemId: string,
    quantity: number,
  ): Promise<{ id: string; quantity: number }> {
    const existing = await this.db
      .select({ id: cartItem.id, productId: cartItem.productId, quantity: cartItem.quantity })
      .from(cartItem)
      .where(and(eq(cartItem.id, itemId), eq(cartItem.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('购物车项不存在');
    }

    if (quantity <= 0) {
      await this.db.delete(cartItem).where(eq(cartItem.id, itemId));
      return { id: itemId, quantity: 0 };
    }

    const prodRows = await this.db
      .select({ stock: product.stock })
      .from(product)
      .where(eq(product.id, existing[0].productId))
      .limit(1);

    if (prodRows.length > 0 && quantity > prodRows[0].stock) {
      throw new BadRequestException('库存不足');
    }

    const updated = await this.db
      .update(cartItem)
      .set({ quantity })
      .where(eq(cartItem.id, itemId))
      .returning({ id: cartItem.id, quantity: cartItem.quantity });

    return { id: updated[0].id, quantity: updated[0].quantity };
  }

  async removeItem(userId: string, itemId: string): Promise<{ success: true }> {
    const deleted = await this.db
      .delete(cartItem)
      .where(and(eq(cartItem.id, itemId), eq(cartItem.userId, userId)))
      .returning({ id: cartItem.id });

    if (deleted.length === 0) {
      throw new NotFoundException('购物车项不存在');
    }

    return { success: true };
  }

  async clearCart(userId: string): Promise<{ success: true }> {
    await this.db.delete(cartItem).where(eq(cartItem.userId, userId));
    return { success: true };
  }
}
