import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Store,
  MapPin,
  Phone,
  Clock,
  Package,
  CheckCircle,
} from 'lucide-react';
import { riderApi, type RiderOrder } from '../../../api/rider';
import { Button } from '@client/src/components/ui/button';
import { Card } from '@client/src/components/ui/card';
import { Badge } from '@client/src/components/ui/badge';

const statusLabels: Record<string, string> = {
  preparing: '待取餐',
  delivering: '配送中',
  completed: '已完成',
  cancelled: '已取消',
};

const statusColors: Record<string, string> = {
  preparing: 'bg-blue-500',
  delivering: 'bg-orange-500',
  completed: 'bg-green-500',
  cancelled: 'bg-gray-500',
};

const RiderOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<RiderOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadOrder = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await riderApi.getOrderDetail(id);
      setOrder(res);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '加载订单失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const handlePickup = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await riderApi.pickupOrder(id);
      toast.success('取餐成功，开始配送！');
      loadOrder();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliver = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await riderApi.deliverOrder(id);
      toast.success('送达成功！');
      loadOrder();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">订单不存在</p>
        <Button onClick={() => navigate(-1)}>返回</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      {/* 顶部导航栏 */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">订单详情</h1>
          <Badge className={`ml-auto ${statusColors[order.status] || 'bg-gray-500'}`}>
            {statusLabels[order.status] || order.status}
          </Badge>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* 配送状态时间线 */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            配送进度
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">已接单</p>
                <p className="text-xs text-muted-foreground">{formatTime(order.riderAcceptedAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle
                className={`w-5 h-5 flex-shrink-0 ${
                  order.status === 'delivering' || order.status === 'completed'
                    ? 'text-green-500'
                    : 'text-gray-300'
                }`}
              />
              <div>
                <p className="text-sm font-medium">已取餐</p>
                <p className="text-xs text-muted-foreground">{formatTime(order.riderPickedUpAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle
                className={`w-5 h-5 flex-shrink-0 ${
                  order.status === 'completed' ? 'text-green-500' : 'text-gray-300'
                }`}
              />
              <div>
                <p className="text-sm font-medium">已送达</p>
                <p className="text-xs text-muted-foreground">{formatTime(order.riderDeliveredAt)}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* 商家信息 */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Store className="w-4 h-4 text-primary" />
            商家信息
          </h3>
          <div className="space-y-2">
            <p className="font-medium">{order.merchantName}</p>
            <p className="text-sm text-muted-foreground">{order.merchantAddress}</p>
            <a
              href={`tel:${order.merchantPhone}`}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Phone className="w-4 h-4" />
              {order.merchantPhone}
            </a>
          </div>
        </Card>

        {/* 收货信息 */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-600" />
            收货信息
          </h3>
          <div className="space-y-2">
            <p className="font-medium">{order.receiverName}</p>
            <p className="text-sm text-muted-foreground">{order.receiverAddress}</p>
            <a
              href={`tel:${order.receiverPhone}`}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Phone className="w-4 h-4" />
              {order.receiverPhone}
            </a>
          </div>
        </Card>

        {/* 商品列表 */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            商品清单
          </h3>
          <div className="space-y-2">
            {order.items?.map((item, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                </div>
                <p className="text-sm font-medium">¥{item.subtotal}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>商品金额</span>
              <span>¥{order.productTotal}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>配送费</span>
              <span>¥{order.deliveryFee}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-1">
              <span>订单总额</span>
              <span className="text-primary">¥{order.totalAmount}</span>
            </div>
          </div>
        </Card>

        {/* 备注 */}
        {order.remark && (
          <Card className="p-4">
            <h3 className="font-semibold mb-2">订单备注</h3>
            <p className="text-sm text-muted-foreground bg-yellow-50 p-2 rounded">
              {order.remark}
            </p>
          </Card>
        )}
      </div>

      {/* 底部操作按钮 */}
      <div className="fixed bottom-16 left-0 right-0 bg-background border-t p-4 z-20">
        <div className="max-w-2xl mx-auto">
          {order.status === 'preparing' && (
            <Button
              className="w-full"
              size="lg"
              onClick={handlePickup}
              disabled={actionLoading}
            >
              {actionLoading ? '处理中...' : '确认取餐'}
            </Button>
          )}
          {order.status === 'delivering' && (
            <Button
              className="w-full"
              size="lg"
              onClick={handleDeliver}
              disabled={actionLoading}
            >
              {actionLoading ? '处理中...' : '确认送达'}
            </Button>
          )}
          {order.status === 'completed' && (
            <div className="text-center text-green-600 font-medium py-2">
              ✓ 订单已完成
            </div>
          )}
          {order.status === 'cancelled' && (
            <div className="text-center text-gray-500 font-medium py-2">
              订单已取消
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiderOrderDetailPage;
