import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Bike, MapPin, Clock, RefreshCw, Phone, Store } from 'lucide-react';
import { riderApi, type RiderOrder } from '../../../api/rider';
import { Button } from '@client/src/components/ui/button';
import { Card } from '@client/src/components/ui/card';
import { Badge } from '@client/src/components/ui/badge';

const RiderHallPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<RiderOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const loadOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await riderApi.getPendingOrders(1, 50);
      setOrders(res.items || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '加载订单失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    // 每30秒自动刷新
    const interval = setInterval(() => loadOrders(true), 30000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const handleAccept = async (orderId: string) => {
    setAcceptingId(orderId);
    try {
      await riderApi.acceptOrder(orderId);
      toast.success('抢单成功！');
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      navigate('/rider/orders');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '抢单失败');
    } finally {
      setAcceptingId(null);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}秒前`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* 顶部标题栏 */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bike className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold">接单大厅</h1>
            <Badge variant="secondary" className="ml-2">
              {orders.length} 单
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadOrders(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">加载中...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Bike className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">暂无待接单订单</p>
            <p className="text-xs text-muted-foreground/60 mt-1">下拉或点击刷新获取新订单</p>
          </div>
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="p-4 hover:shadow-md transition-shadow">
              {/* 订单头部 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-orange-500">
                    待接单
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(order.createdAt)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-primary">
                    ¥{order.deliveryFee}
                  </span>
                  <p className="text-xs text-muted-foreground">配送费</p>
                </div>
              </div>

              {/* 商家信息 */}
              <div className="flex items-start gap-2 mb-3 pb-3 border-b">
                <Store className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{order.merchantName}</p>
                  <p className="text-xs text-muted-foreground truncate">{order.merchantAddress}</p>
                </div>
                <a
                  href={`tel:${order.merchantPhone}`}
                  className="text-primary hover:text-primary/80"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>

              {/* 收货地址 */}
              <div className="flex items-start gap-2 mb-3">
                <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{order.receiverName}</p>
                  <p className="text-xs text-muted-foreground truncate">{order.receiverAddress}</p>
                </div>
                <a
                  href={`tel:${order.receiverPhone}`}
                  className="text-primary hover:text-primary/80"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>

              {/* 商品信息 */}
              <div className="text-xs text-muted-foreground mb-3">
                共 {order.itemCount} 件商品，订单金额 ¥{order.totalAmount}
              </div>

              {/* 备注 */}
              {order.remark && (
                <div className="text-xs bg-yellow-50 text-yellow-800 p-2 rounded mb-3">
                  备注：{order.remark}
                </div>
              )}

              {/* 抢单按钮 */}
              <Button
                className="w-full"
                size="lg"
                onClick={() => handleAccept(order.id)}
                disabled={acceptingId === order.id}
              >
                {acceptingId === order.id ? '抢单中...' : '立即抢单'}
              </Button>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default RiderHallPage;
