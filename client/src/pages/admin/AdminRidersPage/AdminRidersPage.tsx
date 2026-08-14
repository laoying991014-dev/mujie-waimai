import React, { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Edit2, Trash2, Check, X, Power, Key, Eye, TrendingUp, Users, Bike, DollarSign } from 'lucide-react';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';
import { Badge } from '@client/src/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import {
  listRiders,
  createRider,
  updateRider,
  auditRider,
  updateRiderStatus,
  deleteRider,
  updateRiderPassword,
  getRiderStats,
  getRiderOrders,
  type AdminRider,
  type RiderStats,
  type RiderOrderItem,
} from '@client/src/api/admin-rider';
import type { PaginatedResponse } from '@shared/api.interface';

interface FormState {
  account: string;
  password: string;
  name: string;
  phone: string;
  idCard: string;
}

const PAGE_SIZE = 10;

const STATUS_LABELS: Record<string, string> = {
  all: '全部状态',
  active: '正常',
  disabled: '已禁用',
};

const AUDIT_STATUS_LABELS: Record<string, string> = {
  all: '全部审核',
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
};

const AdminRidersPage: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<AdminRider> | null>(null);
  const [stats, setStats] = useState<RiderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'disabled'>('all');
  const [auditStatus, setAuditStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRider, setEditingRider] = useState<AdminRider | null>(null);
  const [formData, setFormData] = useState<FormState>({
    account: '',
    password: '',
    name: '',
    phone: '',
    idCard: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<AdminRider | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminRider | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<AdminRider | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [ordersDialogOpen, setOrdersDialogOpen] = useState(false);
  const [ordersTarget, setOrdersTarget] = useState<AdminRider | null>(null);
  const [ordersData, setOrdersData] = useState<PaginatedResponse<RiderOrderItem> | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await listRiders({
        page,
        pageSize: PAGE_SIZE,
        keyword,
        status,
        auditStatus,
      });
      setData(result);
    } catch {
      // handled globally
    } finally {
      setLoading(false);
    }
  }, [page, keyword, status, auditStatus]);

  const fetchStats = useCallback(async (): Promise<void> => {
    setStatsLoading(true);
    try {
      const result = await getRiderStats();
      setStats(result);
    } catch {
      // handled globally
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async (riderId: string): Promise<void> => {
    setOrdersLoading(true);
    try {
      const result = await getRiderOrders(riderId, 1, 10);
      setOrdersData(result);
    } catch {
      // handled globally
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchStats();
  }, [fetchData, fetchStats]);

  const handleSearch = (): void => {
    setPage(1);
  };

  const openCreateDialog = (): void => {
    setEditingRider(null);
    setFormData({
      account: '',
      password: '',
      name: '',
      phone: '',
      idCard: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (rider: AdminRider): void => {
    setEditingRider(rider);
    setFormData({
      account: rider.account,
      password: '',
      name: rider.name,
      phone: rider.phone,
      idCard: rider.idCard,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!formData.name || !formData.phone) {
      toast.error('请填写姓名和手机号');
      return;
    }
    if (!editingRider) {
      if (!formData.account || !formData.password) {
        toast.error('请填写登录账号和密码');
        return;
      }
      if (formData.password.length < 6) {
        toast.error('密码长度至少6位');
        return;
      }
    }
    setSubmitting(true);
    try {
      if (editingRider) {
        await updateRider(editingRider.id, {
          name: formData.name,
          phone: formData.phone,
          idCard: formData.idCard,
        });
        toast.success('更新成功');
      } else {
        await createRider({
          account: formData.account,
          password: formData.password,
          name: formData.name,
          phone: formData.phone,
          idCard: formData.idCard,
        });
        toast.success('创建成功');
      }
      setDialogOpen(false);
      fetchData();
      fetchStats();
    } catch {
      toast.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (rider: AdminRider): Promise<void> => {
    try {
      await auditRider(rider.id, 'approved');
      toast.success('审核通过');
      fetchData();
    } catch {
      toast.error('操作失败');
    }
  };

  const openRejectDialog = (rider: AdminRider): void => {
    setRejectTarget(rider);
    setRejectReason('');
    setRejectOpen(true);
  };

  const handleReject = async (): Promise<void> => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      toast.error('请填写驳回原因');
      return;
    }
    setRejectLoading(true);
    try {
      await auditRider(rejectTarget.id, 'rejected', rejectReason.trim());
      toast.success('已驳回');
      setRejectOpen(false);
      setRejectTarget(null);
      fetchData();
    } catch {
      toast.error('操作失败');
    } finally {
      setRejectLoading(false);
    }
  };

  const handleToggleStatus = async (rider: AdminRider): Promise<void> => {
    const newStatus = rider.status === 'active' ? 'disabled' : 'active';
    try {
      await updateRiderStatus(rider.id, newStatus);
      toast.success(`已${newStatus === 'active' ? '启用' : '禁用'}`);
      fetchData();
      fetchStats();
    } catch {
      toast.error('操作失败');
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteRider(deleteTarget.id);
      toast.success('删除成功');
      setDeleteTarget(null);
      fetchData();
      fetchStats();
    } catch {
      toast.error('删除失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openPasswordDialog = (rider: AdminRider): void => {
    setPasswordTarget(rider);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordDialogOpen(true);
  };

  const handleUpdatePassword = async (): Promise<void> => {
    if (!passwordTarget) return;
    if (!newPassword || newPassword.length < 6) {
      toast.error('密码长度至少6位');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }
    setPasswordLoading(true);
    try {
      await updateRiderPassword(passwordTarget.id, newPassword);
      toast.success('密码修改成功');
      setPasswordDialogOpen(false);
      setPasswordTarget(null);
    } catch {
      toast.error('密码修改失败');
    } finally {
      setPasswordLoading(false);
    }
  };

  const openOrdersDialog = (rider: AdminRider): void => {
    setOrdersTarget(rider);
    setOrdersData(null);
    setOrdersDialogOpen(true);
    fetchOrders(rider.id);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'disabled':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return '';
    }
  };

  const getOnlineStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'online':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'busy':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'offline':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default:
        return '';
    }
  };

  const getAuditBadgeClass = (status: string): string => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'pending':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return '';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">骑手管理</h1>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">骑手总数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '...' : stats?.totalRiders ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">正常: {stats?.activeRiders ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">在线骑手</CardTitle>
            <Bike className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{statsLoading ? '...' : stats?.onlineRiders ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">当前在线配送中</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">完成订单</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '...' : stats?.totalOrders ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">累计完成订单</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">配送收入</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{statsLoading ? '...' : stats?.totalDeliveryFee ?? '0.00'}</div>
            <p className="text-xs text-muted-foreground mt-1">骑手累计配送费</p>
          </CardContent>
        </Card>
      </div>

      {/* 操作栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索账号、姓名、手机号"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v as any); setPage(1); }}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={auditStatus} onValueChange={(v) => { setAuditStatus(v as any); setPage(1); }}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(AUDIT_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleSearch}>搜索</Button>
        <div className="flex-1" />
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4" />
          新增骑手
        </Button>
      </div>

      {/* 表格 */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>账号</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>手机号</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>在线状态</TableHead>
              <TableHead>审核</TableHead>
              <TableHead className="text-right">完成订单</TableHead>
              <TableHead className="text-right">收入</TableHead>
              <TableHead className="text-right">评分</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  加载中...
                </TableCell>
              </TableRow>
            )}
            {!loading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  暂无数据
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              data?.items.map((rider) => (
                <TableRow key={rider.id}>
                  <TableCell className="font-medium">{rider.account}</TableCell>
                  <TableCell>{rider.name}</TableCell>
                  <TableCell>{rider.phone}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={getStatusBadgeClass(rider.status)}>
                      {rider.status === 'active' ? '正常' : '已禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={getOnlineStatusBadgeClass(rider.onlineStatus)}>
                      {rider.onlineStatus === 'online' ? '在线' : rider.onlineStatus === 'busy' ? '配送中' : '离线'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={getAuditBadgeClass(rider.auditStatus)}>
                      {AUDIT_STATUS_LABELS[rider.auditStatus] ?? rider.auditStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{rider.totalOrders}</TableCell>
                  <TableCell className="text-right">¥{rider.totalDeliveryFee}</TableCell>
                  <TableCell className="text-right">{rider.rating}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openOrdersDialog(rider)}
                        title="查看订单"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {rider.auditStatus === 'pending' ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleApprove(rider)}
                            title="通过"
                            className="text-emerald-600 hover:text-emerald-700"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openRejectDialog(rider)}
                            title="驳回"
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(rider)}
                            title="编辑"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openPasswordDialog(rider)}
                            title="重置密码"
                          >
                            <Key className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleStatus(rider)}
                            title={rider.status === 'active' ? '禁用' : '启用'}
                            className={rider.status === 'active' ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'}
                          >
                            <Power className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(rider)}
                            title="删除"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            共 {data.total} 条，第 {page} / {totalPages} 页
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              下一页
            </Button>
          </div>
        </div>
      )}

      {/* 新增/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRider ? '编辑骑手' : '新增骑手'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!editingRider && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">登录账号</label>
                  <Input
                    value={formData.account}
                    onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                    placeholder="请输入登录账号"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">登录密码</label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="至少6位"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">姓名</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入姓名"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">手机号</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="请输入手机号"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">身份证号（选填）</label>
              <Input
                value={formData.idCard}
                onChange={(e) => setFormData({ ...formData, idCard: e.target.value })}
                placeholder="请输入身份证号"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 驳回弹窗 */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>驳回骑手审核</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">驳回原因</label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请输入驳回原因"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>取消</Button>
            <Button onClick={handleReject} disabled={rejectLoading} variant="destructive">
              {rejectLoading ? '提交中...' : '确认驳回'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重置密码弹窗 */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>重置骑手密码</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">新密码</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="至少6位"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">确认密码</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入新密码"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>取消</Button>
            <Button onClick={handleUpdatePassword} disabled={passwordLoading}>
              {passwordLoading ? '保存中...' : '确认重置'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 骑手订单弹窗 */}
      <Dialog open={ordersDialogOpen} onOpenChange={setOrdersDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{ordersTarget?.name} 的订单记录</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {ordersLoading ? (
              <p className="text-center text-muted-foreground py-8">加载中...</p>
            ) : ordersData?.items.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">暂无订单记录</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {ordersData?.items.map((order) => (
                  <div key={order.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{order.orderNo}</span>
                      <Badge variant="secondary">{order.status}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>收货人：{order.receiverName} {order.receiverPhone}</p>
                      <p>地址：{order.receiverAddress}</p>
                      <p>配送费：¥{order.deliveryFee}</p>
                      <p>下单时间：{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrdersDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除骑手「{deleteTarget?.name}」吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className="bg-red-600 hover:bg-red-700">
              {deleteLoading ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminRidersPage;
