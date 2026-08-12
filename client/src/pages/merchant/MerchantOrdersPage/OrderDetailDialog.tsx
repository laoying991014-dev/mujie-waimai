import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@client/src/components/ui/dialog';
import { Image } from '@client/src/components/ui/image';
import { merchantOrder } from '@client/src/api';
import {
  ORDER_STATUS_LABELS,
  type MerchantOrderDetail,
  type OrderStatus,
} from '@shared/api.interface';

const STATUS_VARIANT_MAP: Record<string, string> = {
  pending_accept: 'bg-warning/15 text-warning border-warning/30',
  preparing: 'bg-info/15 text-info border-info/30',
  delivering: 'bg-info/15 text-info border-info/30',
  completed: 'bg-success/15 text-success border-success/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

const getNextStatus = (status: string): OrderStatus | null => {
  if (status === 'preparing') return 'delivering';
  if (status === 'delivering') return 'completed';
  return null;
};

const getProgressBtnLabel = (status: string): string => {
  if (status === 'preparing') return '开始配送';
  if (status === 'delivering') return '确认完成';
  return '推进';
};

interface OrderDetailDialogProps {
  open: boolean;
  orderId: string | null;
  onOpenChange: (open: boolean) => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onProgress: (id: string, next: OrderStatus) => void;
  onUpdated?: () => void;
}

const OrderDetailDialog: React.FC<OrderDetailDialogProps> = ({
  open,
  orderId,
  onOpenChange,
  onAccept,
  onReject,
  onProgress,
  onUpdated,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [detail, setDetail] = useState<MerchantOrderDetail | null>(null);

  useEffect(() => {
    if (!open || !orderId) {
      setDetail(null);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const data = await merchantOrder.getOrderDetail(orderId);
        setDetail(data);
        onUpdated?.();
      } catch {
        toast.error('加载订单详情失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, orderId, onUpdated]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>订单详情</DialogTitle>
          <DialogDescription>
            {detail ? `订单号：${detail.orderNo}` : '加载中...'}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="py-12 text-center text-muted-foreground">
            加载中...
          </div>
        )}

        {!loading && detail && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className={
                  STATUS_VARIANT_MAP[detail.status] ||
                  'bg-muted text-muted-foreground'
                }
              >
                {ORDER_STATUS_LABELS[detail.status] || detail.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                下单时间：
                {dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </span>
            </div>

            <div className="rounded-lg border p-4 space-y-1.5">
              <div className="text-sm font-medium text-foreground">
                收货人信息
              </div>
              <div className="text-sm text-muted-foreground">
                姓名：{detail.receiverName}
              </div>
              <div className="text-sm text-muted-foreground">
                电话：{detail.receiverPhone}
              </div>
              <div className="text-sm text-muted-foreground">
                地址：{detail.receiverAddress}
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <div className="text-sm font-medium text-foreground">
                商品明细
              </div>
              <div className="space-y-3">
                {detail.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <Image
                      src={item.productImageUrl}
                      alt={item.productName}
                      width={48}
                      height={48}
                      className="rounded-md object-cover size-12"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {item.productName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ¥{item.price} × {item.quantity}
                      </div>
                    </div>
                    <div className="font-mono text-sm font-semibold text-primary">
                      ¥{item.subtotal}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <div className="text-sm font-medium text-foreground">
                费用明细
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">商品合计</span>
                <span className="font-mono">¥{detail.productTotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">配送费</span>
                <span className="font-mono">¥{detail.deliveryFee}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-medium">总金额</span>
                <span className="font-mono font-bold text-primary text-lg">
                  ¥{detail.totalAmount}
                </span>
              </div>
            </div>

            {detail.remark && (
              <div className="rounded-lg border p-4 space-y-1.5">
                <div className="text-sm font-medium text-foreground">
                  订单备注
                </div>
                <div className="text-sm text-muted-foreground">
                  {detail.remark}
                </div>
              </div>
            )}

            {detail.status === 'cancelled' && detail.cancelReason && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-1.5">
                <div className="text-sm font-medium text-destructive">
                  拒单原因
                </div>
                <div className="text-sm text-destructive/90">
                  {detail.cancelReason}
                </div>
              </div>
            )}

            {(detail.status === 'pending_accept' ||
              detail.status === 'preparing' ||
              detail.status === 'delivering') && (
              <div className="flex justify-end gap-2 pt-2">
                {detail.status === 'pending_accept' && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        onOpenChange(false);
                        onReject(detail.id);
                      }}
                    >
                      拒单
                    </Button>
                    <Button
                      onClick={() => {
                        onOpenChange(false);
                        onAccept(detail.id);
                      }}
                    >
                      接单
                    </Button>
                  </>
                )}
                {(detail.status === 'preparing' ||
                  detail.status === 'delivering') && (
                  <Button
                    onClick={() => {
                      onOpenChange(false);
                      onProgress(
                        detail.id,
                        getNextStatus(detail.status)!,
                      );
                    }}
                  >
                    {getProgressBtnLabel(detail.status)}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailDialog;
