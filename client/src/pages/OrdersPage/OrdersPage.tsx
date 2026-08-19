import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Clock, Trash2, Check, X } from 'lucide-react';
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

const DELETABLE_STATUSES = new Set(['pending_payment', 'payment_review', 'pending_accept', 'completed', 'cancelled']);

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
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
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
    setSelectedIds(new Set());
    void loadOrders(activeTab, 1, false);
  }, [activeTab, loadOrders]);

  const handleLoadMore = (): void => {
    void loadOrders(activeTab, page + 1, true);
  };

  const toggleSelected = (id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = async (): Promise<void> => {
    if (selectedIds.size === 0 || deleting) return;
    const confirmed = window.confirm(`确定删除选中的 ${selectedIds.size} 个订单吗？删除后订单将从订单列表中移除。`);
    if (!confirmed) return;

    try {
      setDeleting(true);
      for (const id of selectedIds) {
        await orderApi.deleteOrder(id);
      }
      setSelectedIds(new Set());
      setSelectMode(false);
      await loadOrders(activeTab, 1, false);
    } catch (err) {
      logger.error('delete selected orders failed', err);
      window.alert('部分订单删除失败，请刷新后重试。');
      await loadOrders(activeTab, 1, false);
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectAllDeletable = (): void => {
    const deletableIds = orders.filter((order) => DELETABLE_STATUSES.has(order.status)).map((order) => order.id);
    setSelectedIds(new Set(deletableIds));
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
                  isActive ? 'text-primary' : 'text-foreground/70 hover:text-foreground'
                }`}
              >
                {tab.label}
                {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Order actions */}
      {!initialLoading && orders.length > 0 && (
        <div className="px-4 pt-3 flex items-center justify-between gap-2">
          {selectMode ? (
            <>
              <button
                type="button"
                onClick={handleSelectAllDeletable}
                className="text-sm text-primary font-medium"
              >
                全选可删除订单
              </button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}>
                  <X className="w-4 h-4 mr-1" />
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={selectedIds.size === 0 || deleting}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {deleting ? '删除中...' : `删除${selectedIds.size ? ` (${selectedIds.size})` : ''}`}
                </Button>
              </div>
            </>
          ) : (
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={() => setSelectMode(true)}>
                <Trash2 className="w-4 h-4 mr-1" />
                选择订单
              </Button>
            </div>
          )}
        </div>
      )}

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
              selectMode={selectMode}
              selected={selectedIds.has(order.id)}
              onToggleSelect={() => toggleSelected(order.id)}
              onClick={() => navigate(`/orders/${order.id}`)}
            />
          ))
        )}

        {!initialLoading && orders.length > 0 && hasMore && (
          <div className="pt-2 pb-4">
            <Button variant="outline" className="w-full" onClick={handleLoadMore} disabled={loading}>
              {loading ? '加载中...' : '加载更多'}
            </Button>
          </div>
        )}

        {!initialLoading && orders.length > 0 && !hasMore && (
          <div className="text-center text-xs text-muted-foreground py-4">— 没有更多了 —</div>
        )}
      </div>
    </div>
  );
};

interface OrderCardProps {
  order: OrderSummary;
  onClick: () => void;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onClick, selectMode, selected, onToggleSelect }) => {
  const statusColor = ORDER_STATUS_COLORS[order.status] ?? 'muted';
  const statusLabel = ORDER_STATUS_LABELS[order.status] ?? order.status;
  const canDelete = DELETABLE_STATUSES.has(order.status);

  const handleCardClick = (): void => {
    if (selectMode) {
      if (canDelete) onToggleSelect();
      return;
    }
    onClick();
  };

  return (
    <button
      onClick={handleCardClick}
      className={`w-full text-left bg-card rounded-xl p-4 shadow-sm border transition-shadow active:scale-[0.99] ${selected ? 'border-primary ring-1 ring-primary/30' : 'border-border/50 hover:shadow-md'}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {selectMode && (
            <span className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${selected ? 'bg-primary border-primary text-primary-foreground' : canDelete ? 'border-border bg-background' : 'border-border/50 bg-muted'}`}>
              {selected && <Check className="w-3.5 h-3.5" />}
            </span>
          )}
          <Package className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">{order.merchantName}</span>
        </div>
        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${statusBadgeClass(statusColor)}`}>
          {statusLabel}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex -space-x-2">
          {order.firstProductImageUrl ? (
            <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted border border-border/50">
              <Image src={order.firstProductImageUrl} alt="商品图片" width={56} height={56} className="w-full h-full object-cover" sizes="56px" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
              <Package className="w-6 h-6 text-muted-foreground/50" />
            </div>
          )}
          {order.itemCount > 1 && (
            <div className="w-14 h-14 rounded-lg bg-muted border border-border/50 flex items-center justify-center text-xs text-muted-foreground">+{order.itemCount - 1}件</div>
          )}
        </div>
        <div className="text-sm text-muted-foreground">共 <span className="font-medium text-foreground">{order.itemCount}</span> 件商品</div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>{order.createdAt ? formatDate(order.createdAt) : '-'}</span>
        </div>
        <div className="font-mono font-bold text-primary">¥{order.totalAmount}</div>
      </div>
    </button>
  );
};

const OrderListSkeleton: React.FC<{ count: number }> = ({ count }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-card rounded-xl p-4 shadow-sm border border-border/50 space-y-3">
        <div className="flex items-center justify-between"><Skeleton className="h-4 w-28 rounded" /><Skeleton className="h-5 w-16 rounded-full" /></div>
        <div className="flex items-center gap-3"><Skeleton className="w-14 h-14 rounded-lg" /><Skeleton className="h-4 w-20 rounded" /></div>
        <div className="flex items-center justify-between pt-2 border-t border-border/50"><Skeleton className="h-3 w-24 rounded" /><Skeleton className="h-4 w-16 rounded" /></div>
      </div>
    ))}
  </>
);

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4"><Package className="w-10 h-10 text-muted-foreground/50" /></div>
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

export default OrdersPage;
