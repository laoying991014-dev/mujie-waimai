import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Calendar, TrendingUp, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import { Badge } from '@client/src/components/ui/badge';
import { axiosForBackend } from '@client/src/api';

interface DailyStatItem {
  id: string;
  merchantId: string;
  shopName: string;
  statDate: string;
  totalOrders: number;
  totalDeliveryFee: string;
  totalRevenue: string;
  createdAt: string;
}

interface PaginatedResponse {
  items: DailyStatItem[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 30;

const AdminDailyStatsPage: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [calculating, setCalculating] = useState(false);

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        pageSize: PAGE_SIZE,
      };
      if (keyword) params.keyword = keyword;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await axiosForBackend.get('/api/admin/daily-stats', { params });
      // 如果有关键词搜索，前端过滤商家名称
      if (keyword) {
        const filtered = res.data.items.filter((item: DailyStatItem) =>
          item.shopName?.includes(keyword),
        );
        setData({ ...res.data, items: filtered, total: filtered.length });
      } else {
        setData(res.data);
      }
    } catch {
      toast.error('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  }, [page, keyword, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCalculate = async (): Promise<void> => {
    setCalculating(true);
    try {
      await axiosForBackend.post('/api/admin/daily-stats/calculate');
      toast.success('统计计算完成');
      fetchData();
    } catch {
      toast.error('统计计算失败');
    } finally {
      setCalculating(false);
    }
  };

  const handleSearch = (): void => {
    setPage(1);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  // 计算汇总数据
  const summary = data?.items.reduce(
    (acc, item) => {
      acc.totalOrders += item.totalOrders;
      acc.totalDeliveryFee += Number(item.totalDeliveryFee || 0);
      acc.totalRevenue += Number(item.totalRevenue || 0);
      return acc;
    },
    { totalOrders: 0, totalDeliveryFee: 0, totalRevenue: 0 },
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">配送费统计</h1>
          <p className="text-sm text-muted-foreground mt-1">
            每日自动统计各商家配送费收入，支持手动刷新
          </p>
        </div>
        <Button
          onClick={handleCalculate}
          disabled={calculating}
          className="bg-gradient-to-r from-[hsl(16_85%_58%)] to-[hsl(10_80%_52%)] border-0"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${calculating ? 'animate-spin' : ''}`} />
          {calculating ? '计算中...' : '立即计算'}
        </Button>
      </div>

      {/* 汇总卡片 */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              总订单数
            </div>
            <div className="text-2xl font-bold mt-2">{summary.totalOrders}</div>
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              总配送费
            </div>
            <div className="text-2xl font-bold mt-2 text-primary">
              ¥{summary.totalDeliveryFee.toFixed(2)}
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              总营收
            </div>
            <div className="text-2xl font-bold mt-2">
              ¥{summary.totalRevenue.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* 筛选栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索商家名称"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
          />
          <span className="text-muted-foreground">至</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
          />
        </div>
        <Button onClick={handleSearch}>搜索</Button>
        <Button
          variant="outline"
          onClick={() => {
            setKeyword('');
            setStartDate('');
            setEndDate('');
            setPage(1);
          }}
        >
          重置
        </Button>
      </div>

      {/* 表格 */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>统计日期</TableHead>
              <TableHead>商家名称</TableHead>
              <TableHead className="text-right">订单数</TableHead>
              <TableHead className="text-right">配送费</TableHead>
              <TableHead className="text-right">营收</TableHead>
              <TableHead>统计时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  加载中...
                </TableCell>
              </TableRow>
            )}
            {!loading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  暂无统计数据，点击右上角"立即计算"生成统计
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              data?.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant="secondary">{item.statDate}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{item.shopName || '-'}</TableCell>
                  <TableCell className="text-right">{item.totalOrders}</TableCell>
                  <TableCell className="text-right text-primary font-medium">
                    ¥{Number(item.totalDeliveryFee).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    ¥{Number(item.totalRevenue).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(item.createdAt).toLocaleString('zh-CN')}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            共 {data.total} 条记录
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              上一页
            </Button>
            <span className="text-sm">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDailyStatsPage;
