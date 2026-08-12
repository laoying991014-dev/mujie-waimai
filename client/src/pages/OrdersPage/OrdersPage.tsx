import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Clock, ChevronRight } from 'lucide-react';
import { Image } from '@client/src/components/ui/image';
import { Button } from '@client/src/components/ui/button';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { logger } from '@lark-apaas/client-toolkit/logger';
import * as orderApi from '@client/src/api/order';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from '@shared/api.interface';
import type { OrderSummary } from '@shared/api.interface';

type TabKey = 'all' | 'pending_payment' | 'in_progress' | 'completed' | 'cancelled';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending_payment', label: '待付款' },
  { key: 'in_progress', label: '进行中' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
];

const statusBadgeClass = (color: string): string => {
  switch (color) {
    case 'warning':
      return 'bg-[hsl(38_92%_50%)/12] text-[hsl(38_92%_42%)]';
    case 'info':
      return 'bg-[hsl(210_70%_52%)/12] text-[hsl(210_70%_45%)]';
    case 'success':
      return 'bg-[hsl(145_65%_42%)/12] text-[hsl(145_65%_38%)]';
    case 'muted':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-accent text-accent-foreground';
  }
};

const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const pageSize = 10;

  const statusParam = (tab: TabKey): string | undefined => {
    if (tab === 'all') return undefined;
    if (tab === 'in_progress') return 'pending_accept,preparing,delivering';
    return tab;
  };

  const loadOrders = useCallback(
    async (tab: TabKey, pageNum: number, append: boolean): Promise<void> => {
      try {
        if (append) setLoading(true);
        else setInitialLoading(true);
        const res = await orderApi.getOrders({
          page: pageNum,
          pageSize,
          status: statusParam(tab),
        });
        if (append) {
          setOrders((prev) => [...prev, ...res.items]);
        } else {
          setOrders(res.items);
        }
        setTotal(res.total);
        setPage(res.page);
      } catch (err) {
        logger.error('load orders failed', err);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    setOrders([]);
    void loadOrders(activeTab, 1, false);
  }, [activeTab, loadOrders]);

  const handleLoadMore = (): void => {
    void loadOrders(activeTab, page + 1, true);
  };

  const hasMore = orders.length < total;

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky Tabs */}
      <div className="sticky top-14 z-30 bg-background border-b border-border">
        <div className="flex items-center overflow-x-auto scrollbar-none">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors relative ${
                  isActive
                    ? 'text-primary'
                    : 'text-foreground/70 hover:text-foreground'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Order list */}
      <div className="flex-1 px-4 py-3 flex flex-col gap-3">
        {initialLoading ? (
          <OrderListSkeleton count={3} />
        ) : orders.length === 0 ? (
          <EmptyState />
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={() => navigate(`/orders/${order.id}`)}
            />
          ))
        )}

        {!initialLoading && orders.length > 0 && hasMore && (
          <div className="pt-2 pb-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleLoadMore}
              disabled={loading}
            >
              {loading ? '加载中...' : '加载更多'}
            </Button>
          </div>
        )}

        {!initialLoading && orders.length > 0 && !hasMore && (
          <div className="text-center text-xs text-muted-foreground py-4">
            — 没有更多了 —
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- Sub components ---------- */

interface OrderCardProps {
  order: OrderSummary;
  onClick: () => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onClick }) => {
  const statusColor = ORDER_STATUS_COLORS[order.status] ?? 'muted';
  const statusLabel = ORDER_STATUS_LABELS[order.status] ?? order.status;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card rounded-xl p-4 shadow-sm border border-border/50 hover:shadow-md transition-shadow active:scale-[0.99]"
    >
      {/* Top: merchant + status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Package className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">
            {order.merchantName}
          </span>
        </div>
        <span
          className={`px-2.5 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${statusBadgeClass(statusColor)}`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Middle: product image + count */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex -space-x-2">
          {order.firstProductImageUrl ? (
            <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted border border-border/50">
              <Image
                src={order.firstProductImageUrl}
                alt="商品图片"
                width={56}
                height={56}
                className="w-full h-full object-cover"
                sizes="56px"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
              <Package className="w-6 h-6 text-muted-foreground/50" />
            </div>
          )}
          {order.itemCount > 1 && (
            <div className="w-14 h-14 rounded-lg bg-muted border border-border/50 flex items-center justify-center text-xs text-muted-foreground">
              +{order.itemCount - 1}件
            </div>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          共 <span className="font-medium text-foreground">{order.itemCount}</span> 件商品
        </div>
      </div>

      {/* Bottom: time + amount */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>{order.createdAt ? formatDate(order.createdAt) : '-'}</span>
        </div>
        <div className="font-mono font-bold text-primary">
          ¥{order.totalAmount}
        </div>
      </div>
    </button>
  );
};

const OrderListSkeleton: React.FC<{ count: number }> = ({ count }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="bg-card rounded-xl p-4 shadow-sm border border-border/50 space-y-3"
      >
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="w-14 h-14 rounded-lg" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
      </div>
    ))}
  </>
);

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
      <Package className="w-10 h-10 text-muted-foreground/50" />
    </div>
    <div className="text-base font-medium text-foreground mb-1">暂无订单</div>
    <div className="text-sm text-muted-foreground">快去看看有什么好吃的吧</div>
  </div>
);

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${m}-${day} ${hh}:${mm}`;
}

// suppress unused
void ChevronRight;

export default OrdersPage;
