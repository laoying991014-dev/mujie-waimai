import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  Store,
  ClipboardList,
  DollarSign,
  Clock,
  UserPlus,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Card, CardContent } from '@client/src/components/ui/card';
import { Button } from '@client/src/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { getOverview, getTrends } from '@client/src/api/admin-dashboard';
import type { AdminOverview, AdminTrends } from '@shared/api.interface';

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
  suffix?: string;
}> = ({ label, value, icon: Icon, gradient, suffix }) => (
  <Card className={`overflow-hidden border-0 text-white ${gradient}`} data-ai-section-type="card-stat">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-white/80">{label}</p>
          <p className="text-3xl font-bold mt-2 font-mono">
            {value}
            {suffix && <span className="text-lg ml-1">{suffix}</span>}
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const QuickCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  onClick?: () => void;
}> = ({ label, value, icon: Icon, color, onClick }) => (
  <Card
    className="cursor-pointer hover:shadow-md transition-shadow"
    onClick={onClick}
    data-ai-section-type="card-menu"
  >
    <CardContent className="p-5">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold font-mono">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const AdminDashboardPage: React.FC = () => {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [trends, setTrends] = useState<AdminTrends | null>(null);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      setLoading(true);
      try {
        const [ov, tr] = await Promise.all([getOverview(), getTrends(period)]);
        setOverview(ov);
        setTrends(tr);
      } catch {
        // error handled by interceptor
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  const orderOption: EChartsOption = useMemo(() => {
    if (!trends) return {};
    return {
      tooltip: { trigger: 'axis' },
      legend: { type: 'scroll', bottom: 0, data: ['订单量'] },
      grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
      xAxis: {
        type: 'category',
        data: trends.orderTrend.map((t) => t.date),
        boundaryGap: true,
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: '订单量',
          type: 'line',
          smooth: true,
          data: trends.orderTrend.map((t) => t.count ?? 0),
          itemStyle: { color: '#f97316' },
          areaStyle: { color: 'rgba(249, 115, 22, 0.15)' },
        },
      ],
    };
  }, [trends]);

  const revenueOption: EChartsOption = useMemo(() => {
    if (!trends) return {};
    return {
      tooltip: { trigger: 'axis' },
      legend: { type: 'scroll', bottom: 0, data: ['营业额'] },
      grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
      xAxis: {
        type: 'category',
        data: trends.revenueTrend.map((t) => t.date),
        boundaryGap: true,
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: '营业额',
          type: 'line',
          smooth: true,
          data: trends.revenueTrend.map((t) => Number(t.amount ?? 0)),
          itemStyle: { color: '#10b981' },
          areaStyle: { color: 'rgba(16, 185, 129, 0.15)' },
        },
      ],
    };
  }, [trends]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">数据概览</h1>
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">数据概览</h1>
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="总用户数"
          value={overview?.totalUsers ?? 0}
          icon={Users}
          gradient="bg-gradient-to-br from-orange-500 to-rose-500"
        />
        <StatCard
          label="总商家数"
          value={overview?.totalMerchants ?? 0}
          icon={Store}
          gradient="bg-gradient-to-br from-blue-500 to-indigo-500"
        />
        <StatCard
          label="总订单数"
          value={overview?.totalOrders ?? 0}
          icon={ClipboardList}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-500"
        />
        <StatCard
          label="总营业额"
          value={overview?.totalRevenue ?? '0'}
          icon={DollarSign}
          gradient="bg-gradient-to-br from-amber-500 to-orange-500"
          suffix="¥"
        />
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickCard
          label="待审核商家"
          value={overview?.pendingMerchantAudits ?? 0}
          icon={Clock}
          color="bg-amber-500"
        />
        <QuickCard
          label="今日新增用户"
          value={overview?.todayNewUsers ?? 0}
          icon={UserPlus}
          color="bg-emerald-500"
        />
        <QuickCard
          label="今日新增订单"
          value={overview?.todayNewOrders ?? 0}
          icon={ShoppingCart}
          color="bg-blue-500"
        />
        <QuickCard
          label="今日配送费"
          value={`¥${Number(overview?.todayDeliveryFee ?? 0).toFixed(2)}`}
          icon={Truck}
          color="bg-purple-500"
        />
      </div>

      {/* 趋势图 */}
      <div className="flex items-center gap-2 justify-end">
        <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">今日</SelectItem>
            <SelectItem value="week">本周</SelectItem>
            <SelectItem value="month">本月</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setPeriod('week')}>
          刷新
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5">
            <h3 className="text-base font-semibold mb-4">订单量趋势</h3>
            <ReactECharts option={orderOption} theme="ud" className="h-[300px]" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h3 className="text-base font-semibold mb-4">营业额趋势</h3>
            <ReactECharts option={revenueOption} theme="ud" className="h-[300px]" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
