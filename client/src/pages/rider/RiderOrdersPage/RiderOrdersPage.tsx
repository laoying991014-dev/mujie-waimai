import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ClipboardList, MapPin, Clock, Store, Phone, ChevronRight } from 'lucide-react';
import { riderApi, type RiderOrder } from '../../../api/rider';
import { Button } from '@client/src/components/ui/button';
import { Card } from '@client/src/components/ui/card';
import { Badge } from '@client/src/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@client/src/components/ui/tabs';

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

const RiderOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('in_progress');
  const [orders, setOrders] = useState<RiderOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const loadOrders = async (status: string) => {
    setLoading(true);
    try {
      const statusParam = status === 'in_progress' ? undefined : status;
      const res = await riderApi.getMyOrders(1, 50, statusParam);
      setOrders(res.items || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '加载订单失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(activeTab);
  }, [activeTab]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* 顶部标题栏 */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold">我的订单</h1>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="in_progress">进行中</TabsTrigger>
              <TabsTrigger value="delivering">配送中</TabsTrigger>
              <TabsTrigger value="completed">已完成</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">加载中...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">暂无订单</p>
          </div>
        ) : (
          orders.map((order) => (
            <Card
              key={order.id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/rider/orders/${order.id}`)}
            >
              {/* 订单头部 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className={statusColors[order.status] || 'bg-gray-500'}>
                    {statusLabels[order.status] || order.status}
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
              <div className="flex items-start gap-2 mb-2 pb-2 border-b">
                <Store className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{order.merchantName}</p>
                  <p className="text-xs text-muted-foreground truncate">{order.merchantAddress}</p>
                </div>
              </div>

              {/* 收货地址 */}
              <div className="flex items-start gap-2 mb-3">
                <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{order.receiverName}</p>
                  <p className="text-xs text-muted-foreground truncate">{order.receiverAddress}</p>
                </div>
              </div>

              {/* 底部信息 */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>共 {order.itemCount} 件商品</span>
                <div className="flex items-center gap-1 text-primary">
                  查看详情
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default RiderOrdersPage;
