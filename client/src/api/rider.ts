import { axios } from './axios';

export interface RiderInfo {
  id: string;
  account: string;
  name: string;
  phone: string;
  avatarUrl: string;
  onlineStatus: string;
  totalOrders: number;
  rating: string;
}

export interface RiderOrderItem {
  id: string;
  productName: string;
  productImageUrl: string;
  price: string;
  quantity: number;
  subtotal: string;
}

export interface RiderOrder {
  id: string;
  orderNo: string;
  merchantId: string;
  merchantName: string;
  merchantLogoUrl: string;
  merchantAddress: string;
  merchantPhone: string;
  totalAmount: string;
  deliveryFee: string;
  status: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  remark: string;
  riderId?: string | null;
  riderAcceptedAt?: string | null;
  riderPickedUpAt?: string | null;
  riderDeliveredAt?: string | null;
  createdAt: string;
  itemCount: number;
  items?: RiderOrderItem[];
  productTotal?: string;
}

export interface RiderStats {
  id: string;
  name: string;
  phone: string;
  avatarUrl: string;
  onlineStatus: string;
  currentOrderCount: number;
  totalOrders: number;
  totalDeliveryFee: string;
  rating: string;
}

export const riderApi = {
  // 骑手登录
  login: async (account: string, password: string) => {
    const res = await axios.post('/api/auth/rider/login', { account, password });
    return res.data;
  },

  // 骑手注册
  register: async (account: string, password: string, name: string, phone: string) => {
    const res = await axios.post('/api/auth/rider/register', { account, password, name, phone });
    return res.data;
  },

  // 获取待接单订单列表
  getPendingOrders: async (page = 1, pageSize = 20) => {
    const res = await axios.get('/api/rider/orders/pending', { params: { page, pageSize } });
    return res.data;
  },

  // 抢单
  acceptOrder: async (orderId: string) => {
    const res = await axios.post(`/api/rider/orders/${orderId}/accept`);
    return res.data;
  },

  // 取餐
  pickupOrder: async (orderId: string) => {
    const res = await axios.post(`/api/rider/orders/${orderId}/pickup`);
    return res.data;
  },

  // 送达
  deliverOrder: async (orderId: string) => {
    const res = await axios.post(`/api/rider/orders/${orderId}/deliver`);
    return res.data;
  },

  // 获取骑手订单列表
  getMyOrders: async (page = 1, pageSize = 20, status?: string) => {
    const res = await axios.get('/api/rider/orders', { params: { page, pageSize, status } });
    return res.data;
  },

  // 获取订单详情
  getOrderDetail: async (orderId: string) => {
    const res = await axios.get(`/api/rider/orders/${orderId}`);
    return res.data;
  },

  // 更新在线状态
  updateOnlineStatus: async (onlineStatus: string) => {
    const res = await axios.post('/api/rider/online-status', { onlineStatus });
    return res.data;
  },

  // 获取骑手统计信息
  getStats: async () => {
    const res = await axios.get('/api/rider/stats');
    return res.data;
  },
};
