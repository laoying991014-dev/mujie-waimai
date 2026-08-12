import React, { useCallback, useEffect, useState } from 'react';
import {
  Search,
  SearchX,
  Eye,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Badge } from '@client/src/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import Image from '@client/src/components/ui/image';
import {
  listOrders,
  getOrderDetail,
  updateOrderStatus,
} from '@client/src/api/admin-order';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from '@shared/api.interface';
import type {
  AdminOrder,
  AdminOrderDetail,
  OrderItem,
  PaginatedResponse,
} from '@shared/api.interface';

const PAGE_SIZE = 10;

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'pending_payment', label: '待付款' },
  { value: 'pending_accept', label: '待接单' },
  { value: 'preparing', label: '制作中' },
  { value: 'delivering', label: '配送中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

const TIMELINE_STATUS_ORDER = [
  'pending_payment',
  'pending_accept',
  'preparing',
  'delivering',
  'completed',
];

const statusBadgeClass = (status: string): string => {
  const color = ORDER_STATUS_COLORS[status] ?? 'muted';
  switch (color) {
    case 'warning':
      return 'bg-[hsl(38_92%_50%)]/10 text-[hsl(38_92%_45%)] border-[hsl(38_92%_50%)]/20';
    case 'info':
      return 'bg-[hsl(210_70%_52%)]/10 text-[hsl(210_70%_45%)] border-[hsl(210_70%_52%)]/20';
    case 'success':
      return 'bg-[hsl(145_65%_42%)]/10 text-[hsl(145_65%_38%)] border-[hsl(145_65%_42%)]/20';
    case 'muted':
    default:
      return 'bg-muted/50 text-muted-foreground border-border';
  }
};

const nextStatusOptions = (
  current: string
): { status: string; label: string; variant: 'default' | 'outline' | 'destructive' }[] => {
  switch (current) {
    case 'pending_payment':
      return [
        { status: 'pending_accept', label: '标记为已支付（待接单）', variant: 'default' },
        { status: 'cancelled', label: '取消订单', variant: 'destructive' },
      ];
    case 'pending_accept':
      return [
        { status: 'preparing', label: '接单（制作中）', variant: 'default' },
        { status: 'cancelled', label: '取消订单', variant: 'destructive' },
      ];
    case 'preparing':
      return [{ status: 'delivering', label: '开始配送', variant: 'default' }];
    case 'delivering':
      return [{ status: 'completed', label: '标记为已完成', variant: 'default' }];
    default:
      return [];
  }
};

const AdminOrdersPage: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<AdminOrder> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [orderNo, setOrderNo] = useState('');
  const [status, setStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [appliedFilter, setAppliedFilter] = useState({
    orderNo: '',
    status: 'all',
    startDate: '',
    endDate: '',
  });

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        pageSize: PAGE_SIZE,
      };
      if (appliedFilter.orderNo) params.orderNo = appliedFilter.orderNo;
      if (appliedFilter.status !== 'all') params.status = appliedFilter.status;
      if (appliedFilter.startDate) params.startDate = appliedFilter.startDate;
      if (appliedFilter.endDate) params.endDate = appliedFilter.endDate;
      const result = await listOrders(params);
      setData(result);
    } catch {
      toast.error('加载订单列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, appliedFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (): void => {
    setAppliedFilter({ orderNo, status, startDate, endDate });
    setPage(1);
  };

  const handleReset = (): void => {
    setOrderNo('');
    setStatus('all');
    setStartDate('');
    setEndDate('');
    setAppliedFilter({
      orderNo: '',
      status: 'all',
      startDate: '',
      endDate: '',
    });
    setPage(1);
  };

  const handleViewDetail = async (order: AdminOrder): Promise<void> => {
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const d = await getOrderDetail(order.id);
      setDetail(d);
    } catch {
      toast.error('加载订单详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateStatus = async (nextStatus: string): Promise<void> => {
    if (!detail) return;
    setStatusUpdating(true);
    try {
      await updateOrderStatus(detail.id, nextStatus);
      toast.success('状态已更新');
      const refreshed = await getOrderDetail(detail.id);
      setDetail(refreshed);
      fetchData();
    } catch {
      toast.error('状态更新失败');
    } finally {
      setStatusUpdating(false);
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">订单管理</h1>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索订单号"
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
          />
          <span className="text-muted-foreground text-sm">至</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
          />
        </div>
        <Button onClick={handleSearch}>
          <Search className="w-4 h-4" />
          搜索
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <SearchX className="w-4 h-4" />
          重置
        </Button>
      </div>

      {/* 表格 */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>订单编号</TableHead>
              <TableHead>商家</TableHead>
              <TableHead>用户</TableHead>
              <TableHead className="text-right">商品数</TableHead>
              <TableHead className="text-right">金额</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>下单时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-8"
                >
                  加载中...
                </TableCell>
              </TableRow>
            )}
            {!loading && data?.items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-8"
                >
                  暂无数据
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              data?.items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">
                    {order.orderNo}
                  </TableCell>
                  <TableCell>{order.merchantName}</TableCell>
                  <TableCell>{order.userName}</TableCell>
                  <TableCell className="text-right">
                    {order.productCount}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-foreground">
                    ¥{order.totalAmount}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusBadgeClass(order.status)}
                    >
                      {ORDER_STATUS_LABELS[order.status] ?? order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(order.createdAt).toLocaleString('zh-CN')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewDetail(order)}
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
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
            共 {data.total} 条，第 {page} / {totalPages} 页
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              下一页
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>订单详情</DialogTitle>
          </DialogHeader>

          {detailLoading && (
            <div className="py-16 text-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              加载中...
            </div>
          )}

          {!detailLoading && detail && (
            <div className="space-y-5">
              {/* 顶部：订单号 + 状态 */}
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    订单编号
                  </div>
                  <div className="font-mono text-base font-semibold text-foreground">
                    {detail.orderNo}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={statusBadgeClass(detail.status)}
                >
                  {ORDER_STATUS_LABELS[detail.status] ?? detail.status}
                </Badge>
              </div>

              {/* 收货信息 */}
              <Section title="收货信息">
                <InfoRow label="收货人" value={detail.receiverName} />
                <InfoRow label="手机号" value={detail.userPhone} />
                <InfoRow label="收货地址" value={detail.receiverAddress} />
              </Section>

              {/* 商家信息 */}
              <Section title="商家信息">
                <InfoRow label="商家名称" value={detail.merchantName} />
              </Section>

              {/* 商品明细 */}
              <Section title="商品明细">
                <div className="flex flex-col gap-3">
                  {detail.items.map((item: OrderItem) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <Image
                          src={item.productImageUrl}
                          alt={item.productName}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                          sizes="56px"
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div className="text-sm text-foreground line-clamp-2">
                          {item.productName}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            ¥{item.price} × {item.quantity}
                          </span>
                          <span className="font-mono font-semibold text-foreground text-sm">
                            ¥{item.subtotal}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* 费用明细 */}
              <Section title="费用明细">
                <InfoRow
                  label="商品合计"
                  value={<span className="font-mono">¥{detail.productTotal}</span>}
                />
                <InfoRow
                  label="配送费"
                  value={<span className="font-mono">¥{detail.deliveryFee}</span>}
                />
                <div className="pt-2 mt-2 border-t border-border/50 flex items-center justify-between">
                  <span className="text-sm text-foreground">实付金额</span>
                  <span className="text-lg font-mono font-bold text-primary">
                    ¥{detail.totalAmount}
                  </span>
                </div>
              </Section>

              {/* 订单信息 */}
              <Section title="订单信息">
                <InfoRow
                  label="下单时间"
                  value={
                    <span className="text-sm">
                      {new Date(detail.createdAt).toLocaleString('zh-CN')}
                    </span>
                  }
                />
                {detail.remark && (
                  <InfoRow
                    label="备注"
                    value={
                      <span className="text-sm text-right">
                        {detail.remark}
                      </span>
                    }
                  />
                )}
                {detail.cancelReason && (
                  <InfoRow
                    label="取消原因"
                    value={
                      <span className="text-sm text-right text-destructive">
                        {detail.cancelReason}
                      </span>
                    }
                  />
                )}
              </Section>

              {/* 状态时间线 */}
              {detail.status !== 'cancelled' && (
                <Section title="订单进度">
                  <StatusTimeline
                    currentStatus={detail.status}
                    timeline={detail.statusTimeline || []}
                  />
                </Section>
              )}

              {/* 状态调整 */}
              {nextStatusOptions(detail.status).length > 0 && (
                <div className="pt-4 border-t border-border">
                  <div className="text-sm font-semibold text-foreground mb-3">
                    调整状态
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {nextStatusOptions(detail.status).map((opt) => (
                      <Button
                        key={opt.status}
                        variant={opt.variant}
                        onClick={() => handleUpdateStatus(opt.status)}
                        disabled={statusUpdating}
                      >
                        {statusUpdating && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ---------- Sub components ---------- */

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <div className="space-y-3">
    <div className="text-sm font-semibold text-foreground">{title}</div>
    <div className="bg-accent/40 rounded-lg p-4 space-y-2">{children}</div>
  </div>
);

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-sm text-muted-foreground flex-shrink-0">{label}</span>
    <div className="flex-1 min-w-0 text-right text-foreground">{value}</div>
  </div>
);

interface StatusTimelineProps {
  currentStatus: string;
  timeline: { status: string; time: string }[];
}

const StatusTimeline: React.FC<StatusTimelineProps> = ({
  currentStatus,
  timeline,
}) => {
  const currentIndex = TIMELINE_STATUS_ORDER.indexOf(currentStatus);
  const timelineMap = new Map(timeline.map((t) => [t.status, t.time]));

  return (
    <div className="relative">
      {TIMELINE_STATUS_ORDER.map((s, idx) => {
        const isDone = currentIndex >= 0 && idx < currentIndex;
        const isCurrent = s === currentStatus;
        const time = timelineMap.get(s);
        const label = ORDER_STATUS_LABELS[s] ?? s;

        return (
          <div key={s} className="relative flex gap-3 pb-5 last:pb-0">
            {idx < TIMELINE_STATUS_ORDER.length - 1 && (
              <div
                className={`absolute left-[7px] top-3 bottom-0 w-px ${
                  isDone ? 'bg-[hsl(145_65%_42%)]' : 'bg-muted-foreground/20'
                }`}
              />
            )}
            <div className="relative z-10 flex-shrink-0">
              <div
                className={`w-3 h-3 rounded-full ${
                  isDone
                    ? 'bg-[hsl(145_65%_42%)]'
                    : isCurrent
                      ? 'bg-primary ring-2 ring-primary/30'
                      : 'bg-muted-foreground/30'
                }`}
              />
            </div>
            <div className="flex-1 min-w-0 -mt-0.5">
              <div
                className={`text-sm font-medium ${
                  isDone || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {label}
              </div>
              {time && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {time}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminOrdersPage;
