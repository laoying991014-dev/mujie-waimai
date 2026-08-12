import React, { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Edit2, Trash2, Power } from 'lucide-react';
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
import Image from '@client/src/components/ui/image';
import {
  listUsers,
  createUser,
  updateUser,
  updateUserStatus,
  deleteUser,
} from '@client/src/api/admin-user';
import type { AdminUser, PaginatedResponse } from '@shared/api.interface';

interface FormState {
  phone: string;
  password: string;
  nickname: string;
  avatarUrl: string;
}

const PAGE_SIZE = 10;

const AdminUsersPage: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<AdminUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'disabled'>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState<FormState>({
    phone: '',
    password: '',
    nickname: '',
    avatarUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await listUsers({
        page,
        pageSize: PAGE_SIZE,
        keyword,
        status,
      });
      setData(result);
    } catch {
      // handled globally
    } finally {
      setLoading(false);
    }
  }, [page, keyword, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (): void => {
    setPage(1);
  };

  const handleStatusChange = (value: string): void => {
    setStatus(value as 'all' | 'active' | 'disabled');
    setPage(1);
  };

  const openCreateDialog = (): void => {
    setEditingUser(null);
    setFormData({ phone: '', password: '', nickname: '', avatarUrl: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (user: AdminUser): void => {
    setEditingUser(user);
    setFormData({
      phone: user.phone,
      password: '',
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!formData.phone || !formData.nickname) {
      toast.error('请填写昵称和手机号');
      return;
    }
    if (!editingUser && !formData.password) {
      toast.error('请设置密码');
      return;
    }
    setSubmitting(true);
    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          phone: formData.phone,
          nickname: formData.nickname,
          avatarUrl: formData.avatarUrl,
        });
        toast.success('更新成功');
      } else {
        await createUser({
          phone: formData.phone,
          password: formData.password,
          nickname: formData.nickname,
          avatarUrl: formData.avatarUrl,
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

  const handleToggleStatus = async (user: AdminUser): Promise<void> => {
    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    try {
      await updateUserStatus(user.id, newStatus);
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
      await deleteUser(deleteTarget.id);
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">用户管理</h1>
      </div>

      {/* 操作栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索昵称/手机号"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="active">已启用</SelectItem>
            <SelectItem value="disabled">已禁用</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleSearch}>搜索</Button>
        <div className="flex-1" />
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4" />
          新增用户
        </Button>
      </div>

      {/* 表格 */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户</TableHead>
              <TableHead>手机号</TableHead>
              <TableHead>注册时间</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  加载中...
                </TableCell>
              </TableRow>
            )}
            {!loading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  暂无数据
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              data?.items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                        {user.avatarUrl ? (
                          <Image src={user.avatarUrl} alt={user.nickname} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm">
                            {user.nickname?.[0] ?? 'U'}
                          </div>
                        )}
                      </div>
                      <span className="font-medium">{user.nickname}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.phone}</TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleString('zh-CN')}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.status === 'active' ? 'default' : 'secondary'}
                      className={
                        user.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                      }
                    >
                      {user.status === 'active' ? '启用' : '禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(user)}
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleStatus(user)}
                        title={user.status === 'active' ? '禁用' : '启用'}
                      >
                        <Power className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(user)}
                        title="删除"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? '编辑用户' : '新增用户'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">昵称</label>
              <Input
                value={formData.nickname}
                onChange={(e) =>
                  setFormData({ ...formData, nickname: e.target.value })
                }
                placeholder="请输入昵称"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">手机号</label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="请输入手机号"
              />
            </div>
            {!editingUser && (
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
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">头像URL（可选）</label>
              <Input
                value={formData.avatarUrl}
                onChange={(e) =>
                  setFormData({ ...formData, avatarUrl: e.target.value })
                }
                placeholder="请输入头像图片地址"
              />
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

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除用户「{deleteTarget?.nickname}」吗？此操作不可恢复。
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

export default AdminUsersPage;
