import React, { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Edit2, Trash2, Check, X, Power } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
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
import Image from '@client/src/components/ui/image';
import {
  listMerchants,
  createMerchant,
  updateMerchant,
  auditMerchant,
  toggleMerchantStatus,
  deleteMerchant,
} from '@client/src/api/admin-merchant';
import { getCategories } from '@client/src/api/home';
import type { AdminMerchant, PaginatedResponse, CategoryItem } from '@shared/api.interface';

interface FormState {
  account: string;
  password: string;
  shopName: string;
  contactName: string;
  contactPhone: string;
  address: string;
  categoryId: string;
  deliveryFee: string;
  minOrderAmount: string;
}

const PAGE_SIZE = 10;

const AUDIT_STATUS_LABELS: Record<string, string> = {
  all: '全部状态',
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
};

const AdminMerchantsPage: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<AdminMerchant> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [auditStatus, setAuditStatus] = useState<
    'all' | 'pending' | 'approved' | 'rejected'
  >('all');

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<AdminMerchant | null>(null);
  const [formData, setFormData] = useState<FormState>({
    account: '',
    password: '',
    shopName: '',
    contactName: '',
    contactPhone: '',
    address: '',
    categoryId: '',
    deliveryFee: '',
    minOrderAmount: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<AdminMerchant | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminMerchant | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await listMerchants({
        page,
        pageSize: PAGE_SIZE,
        keyword,
        auditStatus,
      });
      setData(result);
    } catch {
      // handled globally
    } finally {
      setLoading(false);
    }
  }, [page, keyword, auditStatus]);

  const fetchCategories = useCallback(async (): Promise<void> => {
    setCategoriesLoading(true);
    try {
      const res = await getCategories();
      setCategories(res.items);
    } catch {
      // handled globally
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (): void => {
    setPage(1);
  };

  const handleStatusChange = (value: string): void => {
    setAuditStatus(value as 'all' | 'pending' | 'approved' | 'rejected');
    setPage(1);
  };

  const openCreateDialog = (): void => {
    setEditingMerchant(null);
    setFormData({
      account: '',
      password: '',
      shopName: '',
      contactName: '',
      contactPhone: '',
      address: '',
      categoryId: '',
      deliveryFee: '',
      minOrderAmount: '',
    });
    if (categories.length === 0) fetchCategories();
    setDialogOpen(true);
  };

  const openEditDialog = (merchant: AdminMerchant): void => {
    setEditingMerchant(merchant);
    setFormData({
      account: '',
      password: '',
      shopName: merchant.shopName,
      contactName: merchant.contactName,
      contactPhone: merchant.contactPhone,
      address: '',
      categoryId: '',
      deliveryFee: '',
      minOrderAmount: '',
    });
    if (categories.length === 0) fetchCategories();
    setDialogOpen(true);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!formData.shopName || !formData.contactName || !formData.contactPhone) {
      toast.error('请填写店铺名称、联系人和联系电话');
      return;
    }
    if (!editingMerchant) {
      if (!formData.account || !formData.password) {
        toast.error('请填写登录账号和密码');
        return;
      }
    }
    setSubmitting(true);
    try {
      if (editingMerchant) {
        await updateMerchant(editingMerchant.id, {
          shopName: formData.shopName,
          contactName: formData.contactName,
          contactPhone: formData.contactPhone,
          address: formData.address,
          categoryId: formData.categoryId || undefined,
          deliveryFee: formData.deliveryFee,
          minOrderAmount: formData.minOrderAmount,
        });
        toast.success('更新成功');
      } else {
        await createMerchant({
          account: formData.account,
          password: formData.password,
          shopName: formData.shopName,
          contactName: formData.contactName,
          contactPhone: formData.contactPhone,
          address: formData.address,
          categoryId: formData.categoryId,
          deliveryFee: formData.deliveryFee,
          minOrderAmount: formData.minOrderAmount,
        });
        toast.success('创建成功');
      }
      setDialogOpen(false);
      fetchData();
    } catch {
      toast.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (merchant: AdminMerchant): Promise<void> => {
    try {
      await auditMerchant(merchant.id, 'approved');
      toast.success('审核通过');
      fetchData();
    } catch {
      toast.error('操作失败');
    }
  };

  const openRejectDialog = (merchant: AdminMerchant): void => {
    setRejectTarget(merchant);
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
      await auditMerchant(rejectTarget.id, 'rejected', rejectReason.trim());
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

  const handleToggleStatus = async (merchant: AdminMerchant): Promise<void> => {
    const newStatus = merchant.status === 'active' ? 'disabled' : 'active';
    try {
      await toggleMerchantStatus(merchant.id, newStatus);
      toast.success(`已${newStatus === 'active' ? '启用' : '禁用'}`);
      fetchData();
    } catch {
      toast.error('操作失败');
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteMerchant(deleteTarget.id);
      toast.success('删除成功');
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error('删除失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

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

  const getAuditLabel = (status: string): string => {
    return AUDIT_STATUS_LABELS[status] ?? status;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">商家管理</h1>
      </div>

      {/* 操作栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索商家名称"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <Select value={auditStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">待审核</SelectItem>
            <SelectItem value="approved">已通过</SelectItem>
            <SelectItem value="rejected">已驳回</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleSearch}>搜索</Button>
        <div className="flex-1" />
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4" />
          新增商家
        </Button>
      </div>

      {/* 表格 */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>店铺</TableHead>
              <TableHead>联系人</TableHead>
              <TableHead>联系电话</TableHead>
              <TableHead>审核状态</TableHead>
              <TableHead>营业状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
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
                  暂无数据
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              data?.items.map((merchant) => (
                <TableRow key={merchant.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {merchant.shopLogoUrl ? (
                          <Image src={merchant.shopLogoUrl} alt={merchant.shopName} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm">
                            {merchant.shopName?.[0] ?? 'S'}
                          </div>
                        )}
                      </div>
                      <span className="font-medium">{merchant.shopName}</span>
                    </div>
                  </TableCell>
                  <TableCell>{merchant.contactName}</TableCell>
                  <TableCell>{merchant.contactPhone}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={getAuditBadgeClass(merchant.auditStatus)}
                    >
                      {getAuditLabel(merchant.auditStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={
                          merchant.businessStatus === 'open'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                        }
                      >
                        {merchant.businessStatus === 'open' ? '营业中' : '休息中'}
                      </Badge>
                      {merchant.status === 'disabled' && (
                        <Badge
                          variant="secondary"
                          className="bg-red-500/10 text-red-600 border-red-500/20"
                        >
                          已禁用
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {merchant.auditStatus === 'pending' ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleApprove(merchant)}
                            title="通过"
                            className="text-emerald-600 hover:text-emerald-700"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openRejectDialog(merchant)}
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
                            onClick={() => openEditDialog(merchant)}
                            title="编辑"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleStatus(merchant)}
                            title={merchant.status === 'active' ? '禁用' : '启用'}
                          >
                            <Power className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(merchant)}
                            title="删除"
                            className="text-destructive hover:text-destructive"
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMerchant ? '编辑商家' : '新增商家'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {!editingMerchant && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">登录账号</label>
                  <Input
                    value={formData.account}
                    onChange={(e) =>
                      setFormData({ ...formData, account: e.target.value })
                    }
                    placeholder="请输入登录账号"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">密码</label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="请设置密码"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">店铺名称</label>
              <Input
                value={formData.shopName}
                onChange={(e) =>
                  setFormData({ ...formData, shopName: e.target.value })
                }
                placeholder="请输入店铺名称"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">联系人</label>
                <Input
                  value={formData.contactName}
                  onChange={(e) =>
                    setFormData({ ...formData, contactName: e.target.value })
                  }
                  placeholder="请输入联系人"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">联系电话</label>
                <Input
                  value={formData.contactPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPhone: e.target.value })
                  }
                  placeholder="请输入联系电话"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">地址</label>
              <Input
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="请输入店铺地址"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">所属分类</label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) =>
                  setFormData({ ...formData, categoryId: value })
                }
                disabled={categoriesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">配送费（元）</label>
                <Input
                  value={formData.deliveryFee}
                  onChange={(e) =>
                    setFormData({ ...formData, deliveryFee: e.target.value })
                  }
                  placeholder="例如：3.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">起送金额（元）</label>
                <Input
                  value={formData.minOrderAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, minOrderAmount: e.target.value })
                  }
                  placeholder="例如：20.00"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? '提交中...' : '确定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 驳回原因弹窗 */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>驳回申请</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              请填写驳回原因，商家将收到此通知。
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请输入驳回原因"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleReject}
              disabled={rejectLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {rejectLoading ? '提交中...' : '确认驳回'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除商家「{deleteTarget?.shopName}」吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteLoading}
            >
              {deleteLoading ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminMerchantsPage;
