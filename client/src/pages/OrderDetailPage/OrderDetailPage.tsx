import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Clock,
  Copy,
  Store,
  Check,
  Loader2,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Image } from '@client/src/components/ui/image';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@client/src/components/ui/dialog';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from '@shared/api.interface';
import type { OrderDetail as OrderDetailType } from '@shared/api.interface';
import * as orderApi from '@client/src/api/order';

const TIMELINE_STATUS_ORDER = [
  'pending_payment',
  'pending_accept',
  'preparing',
  'delivering',
  'completed',
];

const statusBannerBg = (status: string): string => {
  const color = ORDER_STATUS_COLORS[status] ?? 'muted';
  switch (color) {
    case 'warning':
      return 'from-[hsl(38_92%_58%)] to-[hsl(32_90%_48%)]';
    case 'info':
      return 'from-[hsl(210_70%_58%)] to-[hsl(210_65%_48%)]';
    case 'success':
      return 'from-[hsl(145_60%_48%)] to-[hsl(145_65%_38%)]';
    case 'muted':
      return 'from-muted-foreground/60 to-muted-foreground/40';
    default:
      return 'from-primary to-primary/80';
  }
};

const statusDescription = (status: string): string => {
  switch (status) {
    case 'pending_payment':
      return '请尽快完成支付，超时订单将自动取消';
    case 'pending_accept':
      return '商家正在接单，请稍候';
    case 'preparing':
      return '商家正在精心制作您的餐品';
    case 'delivering':
      return '骑手正在配送中，请保持电话畅通';
    case 'completed':
      return '订单已完成，感谢您的支持';
    case 'cancelled':
      return '订单已取消';
    default:
      return '';
  }
};

const OrderDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadDetail = useCallback(async (): Promise<void> => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await orderApi.getOrderDetail(id);
      setOrder(data);
    } catch (err) {
      logger.error('load order detail failed', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const handleCopyOrderNo = (): void => {
    if (!order) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(order.orderNo)
        .then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        })
        .catch(() => {
          /* ignore */
        });
    }
  };

  const handleCancelOrder = async (): Promise<void> => {
    if (!order || !cancelReason.trim()) return;
    try {
      setSubmitting(true);
      await orderApi.cancelOrder(order.id, cancelReason.trim());
      setCancelOpen(false);
      setCancelReason('');
      await loadDetail();
    } catch (err) {
      logger.error('cancel order failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="text-foreground font-medium">订单不存在或已删除</div>
        <Button variant="outline" onClick={() => navigate('/orders')}>
          返回订单列表
        </Button>
      </div>
    );
  }

  const statusColor = ORDER_STATUS_COLORS[order.status] ?? 'muted';
  const statusLabel = ORDER_STATUS_LABELS[order.status] ?? order.status;
  const isCancelled = order.status === 'cancelled';
  const isCompleted = order.status === 'completed';
  const isPendingPayment = order.status === 'pending_payment';
  const isInProgress =
    order.status === 'pending_accept' ||
    order.status === 'preparing' ||
    order.status === 'delivering';
  const canCancel = order.status === 'pending_payment' || order.status === 'pending_accept';

  return (
    <div className="min-h-full flex flex-col pb-24">
      {/* Top bar */}
      <div className="sticky top-14 z-30 bg-card/80 backdrop-blur border-b border-border">
        <div className="h-12 flex items-center gap-3 px-4">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="text-base font-semibold text-foreground">订单详情</div>
        </div>
      </div>

      {/* Status banner */}
      <div className={`bg-gradient-to-br ${statusBannerBg(order.status)} px-4 py-6 text-white`}>
        <div className="text-2xl font-bold mb-1">{statusLabel}</div>
        <div className="text-sm opacity-90">{statusDescription(order.status)}</div>
        {isCancelled && order.cancelReason && (
          <div className="mt-2 text-xs opacity-80">
            取消原因：{order.cancelReason}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 px-4 py-3 -mt-2">
        {/* Receiver info */}
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-foreground">
                  {order.receiverName}
                </span>
                <span className="text-sm text-muted-foreground">
                  {order.receiverPhone}
                </span>
              </div>
              <div className="text-sm text-foreground/80 break-words">
                {order.receiverAddress}
              </div>
            </div>
          </div>
        </div>

        {/* Merchant + items */}
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
          <button
            onClick={() => navigate(`/shop/${order.merchantId}`)}
            className="w-full flex items-center gap-2 pb-3 border-b border-border/50 mb-3"
          >
            <Store className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium text-foreground flex-1 text-left truncate">
              {order.merchantName}
            </span>
            <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
          </button>

          <div className="flex flex-col gap-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <Image
                    src={item.productImageUrl}
                    alt={item.productName}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    sizes="64px"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div className="text-sm text-foreground line-clamp-2">
                    {item.productName}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      x{item.quantity}
                    </span>
                    <span className="font-mono font-semibold text-foreground">
                      ¥{item.subtotal}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order info */}
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50 flex flex-col gap-2.5">
          <InfoRow
            label="订单编号"
            value={
              <button
                onClick={handleCopyOrderNo}
                className="flex items-center gap-1.5 font-mono text-sm text-foreground"
              >
                {order.orderNo}
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-success" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>
            }
          />
          <InfoRow
            label="下单时间"
            value={
              <span className="text-sm text-foreground">{order.createdAt}</span>
            }
          />
          {order.remark && (
            <InfoRow
              label="订单备注"
              value={
                <span className="text-sm text-foreground text-right">
                  {order.remark}
                </span>
              }
            />
          )}
        </div>

        {/* Fee breakdown */}
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50 flex flex-col gap-2.5">
          <InfoRow
            label="商品合计"
            value={
              <span className="font-mono text-sm text-foreground">
                ¥{order.productTotal}
              </span>
            }
          />
          <InfoRow
            label="配送费"
            value={
              <span className="font-mono text-sm text-foreground">
                ¥{order.deliveryFee}
              </span>
            }
          />
          <div className="pt-2 border-t border-border/50 flex items-center justify-between">
            <span className="text-sm text-foreground">实付金额</span>
            <span className="text-xl font-mono font-bold text-primary">
              ¥{order.totalAmount}
            </span>
          </div>
        </div>

        {/* Status timeline */}
        {!isCancelled && (
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
            <div className="text-sm font-semibold text-foreground mb-4">
              订单进度
            </div>
            <StatusTimeline
              currentStatus={order.status}
              timeline={order.statusTimeline || []}
            />
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border md:hidden">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-end gap-2">
          {isPendingPayment && (
            <>
              <Button variant="outline" onClick={() => setCancelOpen(true)}>
                取消订单
              </Button>
              <Button>去支付</Button>
            </>
          )}
          {isInProgress && (
            <>
              {canCancel && (
                <Button variant="outline" onClick={() => setCancelOpen(true)}>
                  取消订单
                </Button>
              )}
              <Button variant="outline">
                <Phone className="w-4 h-4" />
                联系商家
              </Button>
            </>
          )}
          {isCompleted && (
            <>
              <Button variant="outline">评价</Button>
              <Button>再来一单</Button>
            </>
          )}
          {isCancelled && (
            <>
              <Button variant="outline">删除订单</Button>
              <Button>重新下单</Button>
            </>
          )}
        </div>
      </div>

      {/* Cancel dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>取消订单</DialogTitle>
            <DialogDescription>
              请填写取消原因，取消后订单将无法恢复
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="请输入取消原因..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              再想想
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelOrder}
              disabled={submitting || !cancelReason.trim()}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              确认取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ---------- Sub components ---------- */

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-sm text-muted-foreground flex-shrink-0">{label}</span>
    <div className="flex-1 min-w-0 text-right">{value}</div>
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
      {TIMELINE_STATUS_ORDER.map((status, idx) => {
        const isCompleted = currentIndex >= 0 && idx < currentIndex;
        const isCurrent = status === currentStatus;
        const isPending = !isCompleted && !isCurrent;
        const time = timelineMap.get(status);
        const label = ORDER_STATUS_LABELS[status] ?? status;

        return (
          <div key={status} className="relative flex gap-3 pb-5 last:pb-0">
            {/* vertical line */}
            {idx < TIMELINE_STATUS_ORDER.length - 1 && (
              <div
                className={`absolute left-[7px] top-3 bottom-0 w-px ${
                  isCompleted ? 'bg-success' : 'bg-muted-foreground/20'
                }`}
              />
            )}
            {/* dot */}
            <div className="relative z-10 flex-shrink-0">
              <div
                className={`w-3 h-3 rounded-full ${
                  isCompleted
                    ? 'bg-success'
                    : isCurrent
                      ? 'bg-primary ring-2 ring-primary/30'
                      : 'bg-muted-foreground/30'
                }`}
              />
            </div>
            {/* content */}
            <div className="flex-1 min-w-0 -mt-0.5">
              <div
                className={`text-sm font-medium ${
                  isCompleted || isCurrent
                    ? 'text-foreground'
                    : 'text-muted-foreground'
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

const DetailSkeleton: React.FC = () => (
  <div className="flex flex-col gap-3 px-4 py-3">
    <div className="h-24 rounded-xl bg-muted animate-pulse" />
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        className="bg-card rounded-xl p-4 shadow-sm border border-border/50 space-y-3"
      >
        {Array.from({ length: 3 }).map((_, j) => (
          <div key={j} className="flex items-center justify-between">
            <div className="h-3 w-16 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
        ))}
      </div>
    ))}
  </div>
);

// suppress unused
void Clock;

export default OrderDetailPage;
