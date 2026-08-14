import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@client/src/components/ui/tabs';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@client/src/components/ui/table';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@client/src/components/ui/alert-dialog';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from '@client/src/components/ui/pagination';
import { Card, CardContent } from '@client/src/components/ui/card';
import { EyeIcon, CheckCircle2Icon, XCircleIcon, PackageIcon, RefreshCw } from 'lucide-react';
import { merchantOrder } from '@client/src/api';
import {
  ORDER_STATUS_LABELS,
  type MerchantOrderItem,
  type OrderStatus,
} from '@shared/api.interface';
import OrderDetailDialog from './OrderDetailDialog';

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending_accept', label: '待接单' },
  { value: 'preparing', label: '制作中' },
  { value: 'delivering', label: '配送中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

const STATUS_VARIANT_MAP: Record<string, string> = {
  pending_accept: 'bg-warning/15 text-warning border-warning/30',
  preparing: 'bg-info/15 text-info border-info/30',
  delivering: 'bg-info/15 text-info border-info/30',
  completed: 'bg-success/15 text-success border-success/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

const PAGE_SIZE = 10;

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

const MerchantOrdersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [orders, setOrders] = useState<MerchantOrderItem[]>([]);

  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);

  const [confirmType, setConfirmType] = useState<
    'accept' | 'reject' | 'progress' | null
  >(null);
  const [targetOrderId, setTargetOrderId] = useState<string>('');
  const [targetStatus, setTargetStatus] = useState<OrderStatus>(
    'preparing',
  );
  const [rejectReason, setRejectReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await merchantOrder.getOrderList({
        page,
        pageSize: PAGE_SIZE,
        status: activeTab === 'all' ? undefined : activeTab,
      });
      setOrders(res.items);
      setTotal(res.total);
    } catch {
      toast.error('加载订单列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPage(1);
  };

  const openDetail = (id: string) => {
    setDetailOrderId(id);
    setDetailOpen(true);
  };

  const openAcceptConfirm = (id: string) => {
    setConfirmType('accept');
    setTargetOrderId(id);
  };

  const openRejectConfirm = (id: string) => {
    setConfirmType('reject');
    setTargetOrderId(id);
    setRejectReason('');
  };

  const openProgressConfirm = (id: string, next: OrderStatus) => {
    setConfirmType('progress');
    setTargetOrderId(id);
    setTargetStatus(next);
  };

  const closeConfirm = () => {
    setConfirmType(null);
    setTargetOrderId('');
    setRejectReason('');
  };

  const handleConfirm = async () => {
    if (!targetOrderId || !confirmType) return;
    setSubmitting(true);
    try {
      if (confirmType === 'accept') {
        await merchantOrder.acceptOrder(targetOrderId);
        toast.success('接单成功');
      } else if (confirmType === 'reject') {
        if (!rejectReason.trim()) {
          toast.error('请填写拒单原因');
          setSubmitting(false);
          return;
        }
        await merchantOrder.rejectOrder(targetOrderId, rejectReason.trim());
        toast.success('已拒单');
      } else if (confirmType === 'progress') {
        await merchantOrder.progressOrder(targetOrderId, targetStatus);
        const label = ORDER_STATUS_LABELS[targetStatus] || targetStatus;
        toast.success(`状态已更新为「${label}」`);
      }
      closeConfirm();
      fetchOrders();
    } catch {
      toast.error('操作失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmTitle = (): string => {
    if (confirmType === 'accept') return '确认接单';
    if (confirmType === 'reject') return '确认拒单';
    if (confirmType === 'progress') {
      const label = ORDER_STATUS_LABELS[targetStatus] || targetStatus;
      return `确认更新为「${label}」`;
    }
    return '';
  };

  const confirmDesc = (): string => {
    if (confirmType === 'accept')
      return '接单后订单将进入制作中状态，确定接单吗？';
    if (confirmType === 'reject') return '拒单后将返还商品库存，请填写拒单原因。';
    if (confirmType === 'progress') {
      const label = ORDER_STATUS_LABELS[targetStatus] || targetStatus;
      return `确定将订单状态更新为「${label}」吗？`;
    }
    return '';
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={
                page === 1
                  ? 'pointer-events-none opacity-50'
                  : 'cursor-pointer'
              }
            />
          </PaginationItem>
          <PaginationItem>
            <span className="px-3 text-sm text-muted-foreground">
              第 {page} / {totalPages} 页
            </span>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={
                page === totalPages
                  ? 'pointer-events-none opacity-50'
                  : 'cursor-pointer'
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">订单管理</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchOrders()}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              {STATUS_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {STATUS_TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>订单号</TableHead>
                        <TableHead>下单时间</TableHead>
                        <TableHead>用户姓名</TableHead>
                        <TableHead>用户电话</TableHead>
                        <TableHead>商品件数</TableHead>
                        <TableHead>金额</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading && (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center py-10 text-muted-foreground"
                          >
                            加载中...
                          </TableCell>
                        </TableRow>
                      )}
                      {!loading && orders.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center py-10 text-muted-foreground"
                          >
                            暂无订单
                          </TableCell>
                        </TableRow>
                      )}
                      {!loading &&
                        orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-xs">
                              {order.orderNo}
                            </TableCell>
                            <TableCell>
                              {dayjs(order.createdAt).format(
                                'YYYY-MM-DD HH:mm',
                              )}
                            </TableCell>
                            <TableCell>{order.userName}</TableCell>
                            <TableCell>{order.userPhone}</TableCell>
                            <TableCell>{order.productCount} 件</TableCell>
                            <TableCell className="font-mono font-semibold text-primary">
                              ¥{order.totalAmount}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  STATUS_VARIANT_MAP[order.status] ||
                                  'bg-muted text-muted-foreground'
                                }
                              >
                                {ORDER_STATUS_LABELS[order.status] ||
                                  order.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openDetail(order.id)}
                                >
                                  <EyeIcon className="size-3.5" />
                                  详情
                                </Button>
                                {order.status === 'pending_accept' && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        openAcceptConfirm(order.id)
                                      }
                                    >
                                      <CheckCircle2Icon className="size-3.5" />
                                      接单
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() =>
                                        openRejectConfirm(order.id)
                                      }
                                    >
                                      <XCircleIcon className="size-3.5" />
                                      拒单
                                    </Button>
                                  </>
                                )}
                                {(order.status === 'preparing' ||
                                  order.status === 'delivering') && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      openProgressConfirm(
                                        order.id,
                                        getNextStatus(order.status)!,
                                      )
                                    }
                                  >
                                    <PackageIcon className="size-3.5" />
                                    {getProgressBtnLabel(order.status)}
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  {renderPagination()}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <OrderDetailDialog
        open={detailOpen}
        orderId={detailOrderId}
        onOpenChange={setDetailOpen}
        onAccept={openAcceptConfirm}
        onReject={openRejectConfirm}
        onProgress={openProgressConfirm}
        onUpdated={fetchOrders}
      />

      <AlertDialog
        open={confirmType !== null}
        onOpenChange={(open) => {
          if (!open && !submitting) closeConfirm();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle()}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDesc()}</AlertDialogDescription>
          </AlertDialogHeader>

          {confirmType === 'reject' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">拒单原因</label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请输入拒单原因"
                rows={4}
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
              disabled={submitting}
              className={
                confirmType === 'reject'
                  ? 'bg-destructive text-destructive-foreground border-destructive-border hover:bg-destructive/90'
                  : ''
              }
            >
              {submitting ? '处理中...' : '确认'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MerchantOrdersPage;
