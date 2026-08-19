import { axiosForBackend } from '@client/src/api';
import type { OrderDetail, OrderSummary, PaginatedResponse } from '@shared/api.interface';

export async function createOrder(addressId: string, remark?: string): Promise<{ orderId: string; orderNo: string; status: string }> {
  const { data } = await axiosForBackend.post('/api/orders', { addressId, remark });
  return data;
}

export async function getOrders(params: { page?: number; pageSize?: number; status?: string }): Promise<PaginatedResponse<OrderSummary>> {
  const { data } = await axiosForBackend.get('/api/orders', { params });
  return data;
}

export async function getOrderDetail(id: string): Promise<OrderDetail> {
  const { data } = await axiosForBackend.get(`/api/orders/${id}`);
  return data;
}

export async function deleteOrder(id: string): Promise<{ success: true }> {
  const { data } = await axiosForBackend.delete(`/api/orders/${id}`);
  return data;
}

export async function cancelOrder(id: string, reason: string): Promise<{ success: true; status: string }> {
  const { data } = await axiosForBackend.post(`/api/orders/${id}/cancel`, { reason });
  return data;
}

export interface PaymentInfo {
  orderId: string;
  orderNo: string;
  totalAmount: string;
  status: string;
  paymentRecipientName: string;
  paymentPhone: string;
  paymentQrUrl: string;
  paymentLast5?: string;
  paymentSubmittedAt?: string;
  paymentVerifiedAt?: string;
}

export async function getPaymentInfo(id: string): Promise<PaymentInfo> {
  const { data } = await axiosForBackend.get(`/api/orders/${id}/payment`);
  return data;
}

export async function submitPayment(id: string, last5: string): Promise<{ success: true; status: string; paymentLast5: string }> {
  const { data } = await axiosForBackend.post(`/api/orders/${id}/payment`, { last5 });
  return data;
}
