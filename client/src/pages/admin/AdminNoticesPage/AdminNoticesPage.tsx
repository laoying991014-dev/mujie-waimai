import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
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
import { Switch } from '@client/src/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import {
  listNotices,
  createNotice,
  updateNotice,
  deleteNotice,
  getNoticeDetail,
} from '@client/src/api/admin-setting';
import type { NoticeItemFull, PaginatedResponse } from '@shared/api.interface';

interface NoticeFormState {
  title: string;
  content: string;
  status: 'published' | 'draft';
}

const PAGE_SIZE = 10;

const AdminNoticesPage: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<NoticeItemFull> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<NoticeFormState>({
    title: '',
    content: '',
    status: 'draft',
  });
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<NoticeItemFull | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await listNotices({ page, pageSize: PAGE_SIZE });
      setData(result);
    } catch {
      // handled globally
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateDialog = (): void => {
    setEditingId(null);
    setFormData({ title: '', content: '', status: 'draft' });
    setDialogOpen(true);
  };

  const openEditDialog = async (notice: NoticeItemFull): Promise<void> => {
    try {
      const detail = await getNoticeDetail(notice.id);
      setEditingId(notice.id);
      setFormData({
        title: detail.title,
        content: detail.content,
        status: detail.status,
      });
      setDialogOpen(true);
    } catch {
      toast.error('获取公告详情失败');
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!formData.title.trim()) {
      toast.error('请填写公告标题');
      return;
    }
    if (!formData.content.trim()) {
      toast.error('请填写公告内容');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await updateNotice(editingId, formData);
        toast.success('更新成功');
      } else {
        await createNotice(formData);
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

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteNotice(deleteTarget.id);
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
        <h1 className="text-2xl font-bold">公告管理</h1>
      </div>

      {/* 操作栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-sm text-muted-foreground">
          共 {data?.total ?? 0} 条公告
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4" />
          新增公告
        </Button>
      </div>

      {/* 表格 */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>标题</TableHead>
              <TableHead className="w-28">状态</TableHead>
              <TableHead className="w-44">发布时间</TableHead>
              <TableHead className="text-right w-32">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground py-8"
                >
                  加载中...
                </TableCell>
              </TableRow>
            )}
            {!loading && data?.items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground py-8"
                >
                  暂无数据
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              data?.items.map((notice) => (
                <TableRow key={notice.id}>
                  <TableCell className="font-medium">{notice.title}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        notice.status === 'published'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                      }
                    >
                      {notice.status === 'published' ? '已发布' : '草稿'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(notice.createdAt).toLocaleString('zh-CN')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(notice)}
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(notice)}
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
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑公告' : '新增公告'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">公告标题</label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="请输入公告标题"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">公告内容</label>
              <Textarea
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="请输入公告内容"
                rows={6}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">发布状态</div>
                <div className="text-xs text-muted-foreground mt-1">
                  开启后立即发布，关闭则保存为草稿
                </div>
              </div>
              <Switch
                checked={formData.status === 'published'}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    status: checked ? 'published' : 'draft',
                  })
                }
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
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除公告「{deleteTarget?.title}」吗？此操作不可恢复。
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

export default AdminNoticesPage;
