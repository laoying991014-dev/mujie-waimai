/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { boolean, foreignKey, index, integer, numeric, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const banner = pgTable("banner", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 100 }).notNull(),
  imageUrl: text("image_url").notNull(),
  linkUrl: varchar("link_url", { length: 255 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default('active'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const siteSetting = pgTable("site_setting", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteName: varchar("site_name", { length: 100 }).notNull().default('木姐外卖'),
  siteLogoUrl: text("site_logo_url").notNull(),
  customerServicePhone: varchar("customer_service_phone", { length: 20 }).notNull(),
  icpInfo: varchar("icp_info", { length: 100 }).notNull(),
  copyrightInfo: varchar("copyright_info", { length: 255 }).notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const notice = pgTable("notice", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 100 }).notNull(),
  content: text("content").notNull(),
  status: varchar("status", { length: 20 }).notNull().default('published'),
  sortOrder: integer("sort_order").notNull().default(0),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const orderItem = pgTable("order_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull(),
  productId: uuid("product_id").notNull(),
  productName: varchar("product_name", { length: 100 }).notNull(),
  productImageUrl: text("product_image_url").notNull(),
  price: numeric("price").notNull().default('0'),
  quantity: integer("quantity").notNull().default(1),
  subtotal: numeric("subtotal").notNull().default('0'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_order_item_order_id").on(table.orderId),
  foreignKey({
    columns: [table.orderId],
    foreignColumns: [orderInfo.id],
    name: "order_item_order_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.productId],
    foreignColumns: [product.id],
    name: "order_item_product_id_fkey",
  }),
]);

export const orderInfo = pgTable("order_info", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNo: varchar("order_no", { length: 32 }).notNull().unique(),
  userId: uuid("user_id").notNull(),
  merchantId: uuid("merchant_id").notNull(),
  productTotal: numeric("product_total").notNull().default('0'),
  deliveryFee: numeric("delivery_fee").notNull().default('0'),
  totalAmount: numeric("total_amount").notNull().default('0'),
  receiverName: varchar("receiver_name", { length: 50 }).notNull(),
  receiverPhone: varchar("receiver_phone", { length: 20 }).notNull(),
  receiverAddress: varchar("receiver_address", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default('pending_payment'),
  cancelReason: varchar("cancel_reason", { length: 255 }).notNull(),
  remark: varchar("remark", { length: 255 }).notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("order_info_order_no_key").on(table.orderNo),
  index("idx_order_info_user_id").on(table.userId),
  index("idx_order_info_merchant_id").on(table.merchantId),
  index("idx_order_info_status").on(table.status),
  index("idx_order_info_created_at").on(table.createdAt),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [appUser.id],
    name: "order_info_user_id_fkey",
  }),
  foreignKey({
    columns: [table.merchantId],
    foreignColumns: [merchant.id],
    name: "order_info_merchant_id_fkey",
  }),
]);

export const address = pgTable("address", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  receiverName: varchar("receiver_name", { length: 50 }).notNull(),
  receiverPhone: varchar("receiver_phone", { length: 20 }).notNull(),
  province: varchar("province", { length: 50 }).notNull(),
  city: varchar("city", { length: 50 }).notNull(),
  district: varchar("district", { length: 50 }).notNull(),
  detailAddress: varchar("detail_address", { length: 255 }).notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_address_user_id").on(table.userId),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [appUser.id],
    name: "address_user_id_fkey",
  }).onDelete("cascade"),
]);

export const cartItem = pgTable("cart_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  productId: uuid("product_id").notNull(),
  merchantId: uuid("merchant_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("cart_item_user_id_product_id_key").on(table.userId, table.productId),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [appUser.id],
    name: "cart_item_user_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.productId],
    foreignColumns: [product.id],
    name: "cart_item_product_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.merchantId],
    foreignColumns: [merchant.id],
    name: "cart_item_merchant_id_fkey",
  }).onDelete("cascade"),
]);

export const product = pgTable("product", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").notNull(),
  categoryId: uuid("category_id"),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  price: numeric("price").notNull().default('0'),
  stock: integer("stock").notNull().default(0),
  monthSales: integer("month_sales").notNull().default(0),
  mainImageUrl: text("main_image_url").notNull(),
  status: varchar("status", { length: 20 }).notNull().default('on_sale'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_product_merchant_id").on(table.merchantId),
  index("idx_product_category_id").on(table.categoryId),
  index("idx_product_status").on(table.status),
  foreignKey({
    columns: [table.merchantId],
    foreignColumns: [merchant.id],
    name: "product_merchant_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.categoryId],
    foreignColumns: [merchantCategory.id],
    name: "product_category_id_fkey",
  }).onDelete("set null"),
]);

export const merchantCategory = pgTable("merchant_category", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_merchant_category_merchant_id").on(table.merchantId),
  foreignKey({
    columns: [table.merchantId],
    foreignColumns: [merchant.id],
    name: "merchant_category_merchant_id_fkey",
  }).onDelete("cascade"),
]);

export const merchant = pgTable("merchant", {
  id: uuid("id").primaryKey().defaultRandom(),
  account: varchar("account", { length: 50 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  shopName: varchar("shop_name", { length: 100 }).notNull(),
  shopLogoUrl: text("shop_logo_url").notNull(),
  shopCoverUrl: text("shop_cover_url").notNull(),
  shopDescription: text("shop_description").notNull(),
  contactName: varchar("contact_name", { length: 50 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 20 }).notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  categoryId: uuid("category_id"),
  deliveryFee: numeric("delivery_fee").notNull().default('0'),
  minOrderAmount: numeric("min_order_amount").notNull().default('0'),
  businessStartTime: varchar("business_start_time", { length: 10 }).notNull().default('08:00'),
  businessEndTime: varchar("business_end_time", { length: 10 }).notNull().default('22:00'),
  businessStatus: varchar("business_status", { length: 20 }).notNull().default('open'),
  auditStatus: varchar("audit_status", { length: 20 }).notNull().default('approved'),
  auditReason: varchar("audit_reason", { length: 255 }).notNull(),
  rating: numeric("rating").notNull().default('5.0'),
  monthSales: integer("month_sales").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default('active'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("merchant_account_key").on(table.account),
  index("idx_merchant_category_id").on(table.categoryId),
  index("idx_merchant_business_status").on(table.businessStatus),
  index("idx_merchant_audit_status").on(table.auditStatus),
  foreignKey({
    columns: [table.categoryId],
    foreignColumns: [productCategory.id],
    name: "merchant_category_id_fkey",
  }).onDelete("set null"),
]);

export const productCategory = pgTable("product_category", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull(),
  iconUrl: text("icon_url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default('active'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const adminUser = pgTable("admin_user", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  realName: varchar("real_name", { length: 50 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default('admin'),
  status: varchar("status", { length: 20 }).notNull().default('active'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("admin_user_username_key").on(table.username),
]);

export const appUser = pgTable("app_user", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  nickname: varchar("nickname", { length: 50 }).notNull(),
  avatarUrl: text("avatar_url").notNull(),
  status: varchar("status", { length: 20 }).notNull().default('active'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("app_user_phone_key").on(table.phone),
]);

// table aliases
export const addressTable = address;
export const adminUserTable = adminUser;
export const appUserTable = appUser;
export const bannerTable = banner;
export const cartItemTable = cartItem;
export const merchantTable = merchant;
export const merchantCategoryTable = merchantCategory;
export const noticeTable = notice;
export const orderInfoTable = orderInfo;
export const orderItemTable = orderItem;
export const productTable = product;
export const productCategoryTable = productCategory;
export const siteSettingTable = siteSetting;
