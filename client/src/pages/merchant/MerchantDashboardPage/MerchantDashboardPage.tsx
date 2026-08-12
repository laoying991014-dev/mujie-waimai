import React, { useEffect, useState } from 'react';
import { DollarSign, ShoppingBag, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@client/src/components/ui/card';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import { Switch } from '@client/src/components/ui/switch';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@client/src/components/ui/table';
import { merchantDashboard as dashboardApi } from '@client/src/api';
import { merchantSettings as settingsApi } from '@client/src/api';
import type { DashboardStats, MerchantOrderItem } from '@shared/api.interface';

const statCards = [
  {
    key: 'revenue',
    label: '今日营业额',
    icon: DollarSign,
    gradient: 'from-orange-500 to-red-500',
    bg: 'bg-orange-50',
  },
  {
    key: 'orders',
    label: '今日订单数',
    icon: ShoppingBag,
    gradient: 'from-blue-500 to-indigo-500',
    bg: 'bg-blue-50',
  },
  {
    key: 'pending',
    label: '待处理订单',
    icon: Clock,
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
  },
];

const MerchantDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingOrders, setPendingOrders] = useState<MerchantOrderItem[]>([]);
  const [businessStatus, setBusinessStatus] = useState<'open' | 'closed'>('open');
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, ordersData, settings] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getPendingOrders(5),
        settingsApi.getSettings(),
      ]);
      setStats(statsData);
      setPendingOrders(ordersData.items);
      setBusinessStatus(settings.businessStatus);
    } catch (err) {
      toast.error('加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (checked: boolean) => {
    const newStatus: 'open' | 'closed' = checked ? 'open' : 'closed';
    try {
      setStatusLoading(true);
      await settingsApi.updateBusinessStatus(newStatus);
      setBusinessStatus(newStatus);
      toast.success(
        newStatus === 'open' ? '店铺已开始营业' : '店铺已打烊',
      );
    } catch {
      toast.error('状态切换失败');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAccept = (orderNo: string) => {
    toast.success(`已接单：${orderNo}（演示）`);
  };

  const handleReject = (orderNo: string) => {
    toast.error(`已拒单：${orderNo}（演示）`);
  };

  const statValues = [
    `¥${stats?.todayRevenue ?? '0.00'}`,
    stats?.todayOrders ?? 0,
    stats?.pendingOrders ?? 0,
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">工作台</h1>
          <p className="text-sm text-muted-foreground mt-1">
            欢迎回来，查看今日经营数据
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className={`${
              businessStatus === 'open'
                ? 'bg-green-50 text-green-700 hover:bg-green-50'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {businessStatus === 'open' ? '营业中' : '已打烊'}
          </Badge>
          <Switch
            checked={businessStatus === 'open'}
            onCheckedChange={handleStatusChange}
            disabled={statusLoading}
          />
        </div>
      </div>

      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        data-ai-section-type="card-stat"
      >
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={card.key} className="shadow-sm border-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {card.label}
                    </p>
                    <p
                      className={`mt-2 font-bold ${
                        card.key === 'revenue'
                          ? 'text-3xl text-primary font-mono'
                          : 'text-2xl font-mono'
                      }`}
                    >
                      {loading ? '...' : statValues[index]}
                    </p>
                  </div>
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-sm`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-sm border-border">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">待处理订单</h2>
            <Badge variant="secondary" className="bg-info/10 text-info border-transparent">
              {pendingOrders.length} 条
            </Badge>
          </div>
          {pendingOrders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              暂无待处理订单
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>订单号</TableHead>
                  <TableHead>收货人</TableHead>
                  <TableHead>联系电话</TableHead>
                  <TableHead>商品数</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>下单时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">
                      {order.orderNo}
                    </TableCell>
                    <TableCell>{order.userName}</TableCell>
                    <TableCell>{order.userPhone}</TableCell>
                    <TableCell>{order.productCount} 件</TableCell>
                    <TableCell className="font-mono font-semibold text-primary">
                      ¥{order.totalAmount}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAccept(order.orderNo)}
                        >
                          接单
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(order.orderNo)}
                        >
                          拒单
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MerchantDashboardPage;
