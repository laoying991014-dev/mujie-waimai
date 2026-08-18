export interface UserProfile {
  id: string;
  phone: string;
  nickname: string;
  avatarUrl: string;
}

export interface MerchantProfile {
  id: string;
  account: string;
  shopName: string;
  shopLogoUrl: string;
}

export interface AdminProfile {
  id: string;
  username: string;
  realName: string;
  role: string;
}

export interface MerchantBrief {
  id: string;
  shopName: string;
  shopLogoUrl: string;
  shopCoverUrl: string;
  rating: number;
  monthSales: number;
  deliveryFee: string;
  minOrderAmount: string;
  businessStatus: 'open' | 'closed';
  categoryId?: string;
}

export interface HotProductItem {
  id: string;
  name: string;
  mainImageUrl: string;
  price: string;
  monthSales: number;
  merchantId: string;
  merchantName: string;
}

export interface CategoryItem { id: string; name: string; iconUrl: string; }
export interface BannerItem { id: string; title: string; imageUrl: string; linkUrl: string; }
export interface NoticeItem { id: string; title: string; }

export interface ShopDetail {
  id: string; shopName: string; shopLogoUrl: string; shopCoverUrl: string; shopDescription: string;
  rating: number; monthSales: number; deliveryFee: string; minOrderAmount: string;
  businessStartTime: string; businessEndTime: string; businessStatus: 'open' | 'closed';
}
export interface MerchantCategory { id: string; name: string; sortOrder: number; }
export interface ProductItem { id: string; categoryId: string; name: string; description: string; price: string; stock: number; monthSales: number; mainImageUrl: string; status: 'on_sale' | 'off_sale'; }
export interface CartItem { id: string; productId: string; productName: string; productImageUrl: string; price: string; quantity: number; subtotal: string; }
export interface CartInfo { merchantId: string; merchantName: string; deliveryFee: string; items: CartItem[]; productTotal: string; }
export interface AddressItem { id: string; receiverName: string; receiverPhone: string; province: string; city: string; district: string; detailAddress: string; isDefault: boolean; }
export interface OrderItem { id: string; productId: string; productName: string; productImageUrl: string; price: string; quantity: number; subtotal: string; }

export interface OrderSummary {
  id: string; orderNo: string; merchantId: string; merchantName: string; merchantLogoUrl: string;
  totalAmount: string; status: string; itemCount: number; firstProductImageUrl: string; createdAt: string;
}

export interface OrderDetail {
  id: string; orderNo: string; merchantId: string; merchantName: string; merchantLogoUrl: string;
  productTotal: string; deliveryFee: string; totalAmount: string; receiverName: string; receiverPhone: string;
  receiverAddress: string; status: string; cancelReason?: string; remark?: string; items: OrderItem[];
  createdAt: string; statusTimeline: { status: string; time: string }[];
  paymentLast5?: string; paymentSubmittedAt?: string; paymentVerifiedAt?: string;
}

export type OrderStatus = 'pending_payment' | 'payment_review' | 'pending_accept' | 'preparing' | 'delivering' | 'completed' | 'cancelled';

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: '待付款', payment_review: '待核实付款', pending_accept: '待接单', preparing: '制作中',
  delivering: '配送中', completed: '已完成', cancelled: '已取消',
};
export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending_payment: 'warning', payment_review: 'warning', pending_accept: 'info', preparing: 'info',
  delivering: 'info', completed: 'success', cancelled: 'muted',
};

export interface PaginatedResponse<T> { items: T[]; total: number; page: number; pageSize: number; }

export interface MerchantOrderItem { id: string; orderNo: string; userName: string; userPhone: string; productCount: number; totalAmount: string; status: string; createdAt: string; paymentLast5?: string; paymentSubmittedAt?: string; }
export interface MerchantOrderDetail {
  id: string; orderNo: string; productTotal: string; deliveryFee: string; totalAmount: string; receiverName: string;
  receiverPhone: string; receiverAddress: string; status: string; cancelReason?: string; remark?: string; items: OrderItem[];
  createdAt: string; paymentLast5?: string; paymentSubmittedAt?: string; paymentVerifiedAt?: string;
}
export interface DashboardStats { todayRevenue: string; todayOrders: number; pendingOrders: number; }
export interface ShopSettings { shopName: string; shopLogoUrl: string; shopCoverUrl: string; shopDescription: string; businessStartTime: string; businessEndTime: string; deliveryFee: string; minOrderAmount: string; businessStatus: 'open' | 'closed'; }
export interface MerchantProduct { id: string; name: string; mainImageUrl: string; categoryName: string; price: string; stock: number; monthSales: number; status: 'on_sale' | 'off_sale'; }
export interface AdminOverview { totalUsers: number; totalMerchants: number; totalOrders: number; totalRevenue: string; todayNewUsers: number; todayNewOrders: number; todayRevenue: string; todayDeliveryFee: string; pendingMerchantAudits: number; }
export interface TrendItem { date: string; count?: number; amount?: string; }
export interface AdminTrends { orderTrend: TrendItem[]; revenueTrend: TrendItem[]; }
export interface AdminUser { id: string; nickname: string; avatarUrl: string; phone: string; status: 'active' | 'disabled'; createdAt: string; }
export interface AdminMerchant { id: string; shopName: string; shopLogoUrl: string; contactName: string; contactPhone: string; paymentRecipientName: string; paymentPhone: string; auditStatus: 'pending' | 'approved' | 'rejected'; businessStatus: 'open' | 'closed'; status: 'active' | 'disabled'; createdAt: string; }
export interface AdminProduct { id: string; name: string; mainImageUrl: string; merchantId: string; merchantName: string; categoryName: string; price: string; monthSales: number; status: 'on_sale' | 'off_sale'; }
export interface AdminOrder { id: string; orderNo: string; merchantName: string; userName: string; productCount: number; totalAmount: string; status: string; createdAt: string; paymentLast5?: string; }
export interface AdminOrderDetail {
  id: string; orderNo: string; merchantId: string; merchantName: string; merchantPhone: string; merchantAddress: string;
  userId: string; userName: string; userPhone: string; productTotal: string; deliveryFee: string; totalAmount: string;
  receiverName: string; receiverPhone: string; receiverAddress: string; status: string; cancelReason?: string; remark?: string;
  items: OrderItem[]; createdAt: string; statusTimeline: { status: string; time: string }[];
  paymentLast5?: string; paymentSubmittedAt?: string; paymentVerifiedAt?: string;
}
export interface ProductCategory { id: string; name: string; iconUrl: string; sortOrder: number; status: string; }
export interface NoticeItemFull { id: string; title: string; status: 'published' | 'draft'; createdAt: string; }
export interface SiteSettings {
  siteName: string; siteLogoUrl: string; customerServicePhone: string; paymentRecipientName: string; paymentPhone: string; paymentQrUrl: string;
  icpInfo: string; copyrightInfo: string;
}
export interface BannerFull { id: string; title: string; imageUrl: string; linkUrl: string; sortOrder: number; status: 'active' | 'inactive'; }
