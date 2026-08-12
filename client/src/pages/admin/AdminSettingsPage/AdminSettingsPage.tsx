import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@client/src/components/ui/tabs';
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
import Image from '@client/src/components/ui/image';
import {
  getSiteSettings,
  saveSiteSettings,
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from '@client/src/api/admin-setting';
import type { BannerFull, SiteSettings } from '@shared/api.interface';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

interface BannerFormState {
  title: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder: number;
  status: 'active' | 'inactive';
}

const AdminSettingsPage: React.FC = () => {
  // 网站设置
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [siteLoading, setSiteLoading] = useState(true);
  const [siteSaving, setSiteSaving] = useState(false);

  // 活动轮播
  const [banners, setBanners] = useState<BannerFull[]>([]);
  const [bannerLoading, setBannerLoading] = useState(true);

  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerForm, setBannerForm] = useState<BannerFormState>({
    title: '',
    imageUrl: '',
    linkUrl: '',
    sortOrder: 0,
    status: 'active',
  });
  const [bannerSubmitting, setBannerSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<BannerFull | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchSiteSettings = useCallback(async (): Promise<void> => {
    setSiteLoading(true);
    try {
      const data = await getSiteSettings();
      setSiteSettings(data);
    } catch {
      // handled globally
    } finally {
      setSiteLoading(false);
    }
  }, []);

  const fetchBanners = useCallback(async (): Promise<void> => {
    setBannerLoading(true);
    try {
      const result = await listBanners();
      setBanners(result.items);
    } catch {
      // handled globally
    } finally {
      setBannerLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSiteSettings();
    fetchBanners();
  }, [fetchSiteSettings, fetchBanners]);

  const handleSaveSiteSettings = async (): Promise<void> => {
    if (!siteSettings) return;
    if (!siteSettings.siteName.trim()) {
      toast.error('请填写站点名称');
      return;
    }
    setSiteSaving(true);
    try {
      await saveSiteSettings(siteSettings);
      toast.success('保存成功');
    } catch {
      toast.error('保存失败');
    } finally {
      setSiteSaving(false);
    }
  };

  const openCreateBanner = (): void => {
    setEditingBannerId(null);
    setBannerForm({
      title: '',
      imageUrl: '',
      linkUrl: '',
      sortOrder: 0,
      status: 'active',
    });
    setBannerDialogOpen(true);
  };

  const openEditBanner = (banner: BannerFull): void => {
    setEditingBannerId(banner.id);
    setBannerForm({
      title: banner.title,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl,
      sortOrder: banner.sortOrder,
      status: banner.status,
    });
    setBannerDialogOpen(true);
  };

  const handleBannerSubmit = async (): Promise<void> => {
    if (!bannerForm.title.trim()) {
      toast.error('请填写活动标题');
      return;
    }
    if (!bannerForm.imageUrl.trim()) {
      toast.error('请填写活动图片URL');
      return;
    }
    setBannerSubmitting(true);
    try {
      if (editingBannerId) {
        await updateBanner(editingBannerId, bannerForm);
        toast.success('更新成功');
      } else {
        await createBanner(bannerForm);
        toast.success('创建成功');
      }
      setBannerDialogOpen(false);
      fetchBanners();
    } catch {
      toast.error('操作失败');
    } finally {
      setBannerSubmitting(false);
    }
  };

  const handleDeleteBanner = async (): Promise<void> => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteBanner(deleteTarget.id);
      toast.success('删除成功');
      setDeleteTarget(null);
      fetchBanners();
    } catch {
      toast.error('删除失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">设置</h1>
      </div>

      <Tabs defaultValue="site" className="w-full">
        <TabsList>
          <TabsTrigger value="site">网站设置</TabsTrigger>
          <TabsTrigger value="banner">活动配置</TabsTrigger>
        </TabsList>

        {/* 网站设置 */}
        <TabsContent value="site" className="mt-6">
          {siteLoading && (
            <div className="text-center text-muted-foreground py-8">
              加载中...
            </div>
          )}
          {!siteLoading && siteSettings && (
            <div className="bg-white rounded-xl p-6 shadow-sm border max-w-2xl">
              <h2 className="text-xl font-semibold mb-6">网站设置</h2>
              <div className="space-y-5">
                <div className="space-y-2 max-w-md">
                  <label className="text-sm font-medium">站点名称</label>
                  <Input
                    value={siteSettings.siteName}
                    onChange={(e) =>
                      setSiteSettings({
                        ...siteSettings,
                        siteName: e.target.value,
                      })
                    }
                    placeholder="请输入站点名称"
                  />
                </div>
                <div className="space-y-2 max-w-md">
                  <label className="text-sm font-medium">站点Logo URL</label>
                  <Input
                    value={siteSettings.siteLogoUrl}
                    onChange={(e) =>
                      setSiteSettings({
                        ...siteSettings,
                        siteLogoUrl: e.target.value,
                      })
                    }
                    placeholder="请输入Logo图片地址"
                  />
                </div>
                <div className="space-y-2 max-w-md">
                  <label className="text-sm font-medium">客服电话</label>
                  <Input
                    value={siteSettings.customerServicePhone}
                    onChange={(e) =>
                      setSiteSettings({
                        ...siteSettings,
                        customerServicePhone: e.target.value,
                      })
                    }
                    placeholder="请输入客服电话"
                  />
                </div>
                <div className="space-y-2 max-w-md">
                  <label className="text-sm font-medium">备案信息</label>
                  <Input
                    value={siteSettings.icpInfo}
                    onChange={(e) =>
                      setSiteSettings({
                        ...siteSettings,
                        icpInfo: e.target.value,
                      })
                    }
                    placeholder="请输入ICP备案号"
                  />
                </div>
                <div className="space-y-2 max-w-md">
                  <label className="text-sm font-medium">版权信息</label>
                  <Input
                    value={siteSettings.copyrightInfo}
                    onChange={(e) =>
                      setSiteSettings({
                        ...siteSettings,
                        copyrightInfo: e.target.value,
                      })
                    }
                    placeholder="请输入版权信息"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-8">
                <Button onClick={handleSaveSiteSettings} disabled={siteSaving}>
                  <Save className="w-4 h-4 mr-2" />
                  {siteSaving ? '保存中...' : '保存设置'}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 活动配置 */}
        <TabsContent value="banner" className="mt-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="text-sm text-muted-foreground">
              共 {banners.length} 条活动
            </div>
            <Button onClick={openCreateBanner}>
              <Plus className="w-4 h-4" />
              新增活动
            </Button>
          </div>

          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">活动图片</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead>跳转链接</TableHead>
                  <TableHead className="w-20">排序</TableHead>
                  <TableHead className="w-24">状态</TableHead>
                  <TableHead className="text-right w-32">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bannerLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      加载中...
                    </TableCell>
                  </TableRow>
                )}
                {!bannerLoading && banners.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      暂无数据
                    </TableCell>
                  </TableRow>
                )}
                {!bannerLoading &&
                  banners.map((banner) => (
                    <TableRow key={banner.id}>
                      <TableCell>
                        <div className="w-20 h-12 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                          {banner.imageUrl ? (
                            <Image
                              src={banner.imageUrl}
                              alt={banner.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {banner.title}
                      </TableCell>
                      <TableCell>
                        {banner.linkUrl ? (
                          <UniversalLink
                            to={banner.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1 max-w-xs truncate"
                          >
                            <span className="truncate">{banner.linkUrl}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </UniversalLink>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{banner.sortOrder}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            banner.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                          }
                        >
                          {banner.status === 'active' ? '启用' : '停用'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditBanner(banner)}
                            title="编辑"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(banner)}
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
        </TabsContent>
      </Tabs>

      {/* 新增/编辑活动弹窗 */}
      <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {editingBannerId ? '编辑活动' : '新增活动'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">活动标题</label>
              <Input
                value={bannerForm.title}
                onChange={(e) =>
                  setBannerForm({ ...bannerForm, title: e.target.value })
                }
                placeholder="请输入活动标题"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">图片URL</label>
              <Input
                value={bannerForm.imageUrl}
                onChange={(e) =>
                  setBannerForm({ ...bannerForm, imageUrl: e.target.value })
                }
                placeholder="请输入活动图片地址"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">跳转链接</label>
              <Input
                value={bannerForm.linkUrl}
                onChange={(e) =>
                  setBannerForm({ ...bannerForm, linkUrl: e.target.value })
                }
                placeholder="请输入活动跳转链接（可选）"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">排序号</label>
              <Input
                type="number"
                value={bannerForm.sortOrder}
                onChange={(e) =>
                  setBannerForm({
                    ...bannerForm,
                    sortOrder: Number(e.target.value) || 0,
                  })
                }
                placeholder="数字越小越靠前"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <div className="text-sm font-medium">启用状态</div>
                <div className="text-xs text-muted-foreground mt-1">
                  开启后在前端展示，关闭则隐藏
                </div>
              </div>
              <Switch
                checked={bannerForm.status === 'active'}
                onCheckedChange={(checked) =>
                  setBannerForm({
                    ...bannerForm,
                    status: checked ? 'active' : 'inactive',
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBannerDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleBannerSubmit} disabled={bannerSubmitting}>
              {bannerSubmitting ? '提交中...' : '确定'}
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
              确定要删除活动「{deleteTarget?.title}」吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBanner}
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

export default AdminSettingsPage;
