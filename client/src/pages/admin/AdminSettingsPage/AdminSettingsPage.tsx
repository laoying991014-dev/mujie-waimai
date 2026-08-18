import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Save, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/src/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@client/src/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@client/src/components/ui/alert-dialog';
import { Badge } from '@client/src/components/ui/badge';
import { Switch } from '@client/src/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@client/src/components/ui/table';
import Image from '@client/src/components/ui/image';
import ImageUpload from '@client/src/components/ImageUpload';
import { getSiteSettings, saveSiteSettings, listBanners, createBanner, updateBanner, deleteBanner } from '@client/src/api/admin-setting';
import type { BannerFull, SiteSettings } from '@shared/api.interface';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

const AdminSettingsPage: React.FC = () => {
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [siteLoading, setSiteLoading] = useState(true); const [siteSaving, setSiteSaving] = useState(false);
  const [banners, setBanners] = useState<BannerFull[]>([]); const [bannerLoading, setBannerLoading] = useState(true);
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false); const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerForm, setBannerForm] = useState({ title: '', imageUrl: '', linkUrl: '', sortOrder: 0, status: 'active' as 'active' | 'inactive' });
  const [bannerSubmitting, setBannerSubmitting] = useState(false); const [deleteTarget, setDeleteTarget] = useState<BannerFull | null>(null); const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchSite = useCallback(async () => { setSiteLoading(true); try { setSiteSettings(await getSiteSettings()); } catch { toast.error('加载网站设置失败'); } finally { setSiteLoading(false); } }, []);
  const fetchBanners = useCallback(async () => { setBannerLoading(true); try { setBanners((await listBanners()).items); } catch { toast.error('加载活动失败'); } finally { setBannerLoading(false); } }, []);
  useEffect(() => { void fetchSite(); void fetchBanners(); }, [fetchSite, fetchBanners]);

  const saveSite = async () => { if (!siteSettings) return; if (!siteSettings.siteName.trim()) return toast.error('请填写站点名称'); setSiteSaving(true); try { await saveSiteSettings(siteSettings); toast.success('保存成功'); } catch { toast.error('保存失败'); } finally { setSiteSaving(false); } };
  const openCreate = () => { setEditingBannerId(null); setBannerForm({ title: '', imageUrl: '', linkUrl: '', sortOrder: 0, status: 'active' }); setBannerDialogOpen(true); };
  const openEdit = (b: BannerFull) => { setEditingBannerId(b.id); setBannerForm({ title: b.title, imageUrl: b.imageUrl, linkUrl: b.linkUrl, sortOrder: b.sortOrder, status: b.status }); setBannerDialogOpen(true); };
  const submitBanner = async () => { if (!bannerForm.title.trim()) return toast.error('请填写活动标题'); if (!bannerForm.imageUrl.trim()) return toast.error('请上传活动图片'); setBannerSubmitting(true); try { if (editingBannerId) await updateBanner(editingBannerId, bannerForm); else await createBanner(bannerForm); toast.success('保存成功'); setBannerDialogOpen(false); void fetchBanners(); } catch { toast.error('操作失败'); } finally { setBannerSubmitting(false); } };
  const removeBanner = async () => { if (!deleteTarget) return; setDeleteLoading(true); try { await deleteBanner(deleteTarget.id); toast.success('删除成功'); setDeleteTarget(null); void fetchBanners(); } catch { toast.error('删除失败'); } finally { setDeleteLoading(false); } };

  return <div className="p-6 space-y-6">
    <h1 className="text-2xl font-bold">设置</h1>
    <Tabs defaultValue="site">
      <TabsList><TabsTrigger value="site">网站设置</TabsTrigger><TabsTrigger value="banner">活动配置</TabsTrigger></TabsList>
      <TabsContent value="site" className="mt-6">
        {siteLoading ? <div className="py-8 text-center text-muted-foreground">加载中...</div> : siteSettings && <div className="bg-white rounded-xl p-6 shadow-sm border max-w-2xl space-y-5">
          <h2 className="text-xl font-semibold">网站设置</h2>
          <div><label className="text-sm font-medium">站点名称</label><Input className="mt-2" value={siteSettings.siteName} onChange={(e) => setSiteSettings({ ...siteSettings, siteName: e.target.value })} /></div>
          <ImageUpload label="站点Logo" value={siteSettings.siteLogoUrl} onChange={(url) => setSiteSettings({ ...siteSettings, siteLogoUrl: url })} aspectRatio="aspect-square" />
          <div><label className="text-sm font-medium">客服电话</label><Input className="mt-2" value={siteSettings.customerServicePhone} onChange={(e) => setSiteSettings({ ...siteSettings, customerServicePhone: e.target.value })} /></div>
          <div className="border-t pt-5 space-y-4"><div className="font-semibold">收款设置</div><div><label className="text-sm font-medium">收款人姓名</label><Input className="mt-2" value={siteSettings.paymentRecipientName} onChange={(e) => setSiteSettings({ ...siteSettings, paymentRecipientName: e.target.value })} placeholder="客户支付时显示的收款人姓名" /></div><div><label className="text-sm font-medium">收款手机号</label><Input className="mt-2" value={siteSettings.paymentPhone} onChange={(e) => setSiteSettings({ ...siteSettings, paymentPhone: e.target.value })} placeholder="客户支付时显示的收款手机号" /></div></div>
          <div><label className="text-sm font-medium">备案信息</label><Input className="mt-2" value={siteSettings.icpInfo} onChange={(e) => setSiteSettings({ ...siteSettings, icpInfo: e.target.value })} /></div>
          <div><label className="text-sm font-medium">版权信息</label><Input className="mt-2" value={siteSettings.copyrightInfo} onChange={(e) => setSiteSettings({ ...siteSettings, copyrightInfo: e.target.value })} /></div>
          <div className="flex justify-end"><Button onClick={saveSite} disabled={siteSaving}><Save className="w-4 h-4 mr-2" />{siteSaving ? '保存中...' : '保存设置'}</Button></div>
        </div>}
      </TabsContent>
      <TabsContent value="banner" className="mt-6">
        <div className="flex items-center justify-between mb-4"><span className="text-sm text-muted-foreground">共 {banners.length} 条活动</span><Button onClick={openCreate}><Plus className="w-4 h-4" />新增活动</Button></div>
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden"><Table><TableHeader><TableRow><TableHead>活动图片</TableHead><TableHead>标题</TableHead><TableHead>跳转链接</TableHead><TableHead>排序</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader><TableBody>
          {bannerLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8">加载中...</TableCell></TableRow> : banners.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8">暂无数据</TableCell></TableRow> : banners.map((b) => <TableRow key={b.id}><TableCell><div className="w-20 h-12 rounded overflow-hidden bg-muted">{b.imageUrl ? <Image src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" /> : <ImageIcon />}</div></TableCell><TableCell>{b.title}</TableCell><TableCell>{b.linkUrl ? <UniversalLink to={b.linkUrl} target="_blank" className="text-primary inline-flex items-center gap-1 max-w-xs truncate"><span className="truncate">{b.linkUrl}</span><ExternalLink className="w-3 h-3" /></UniversalLink> : '-'}</TableCell><TableCell>{b.sortOrder}</TableCell><TableCell><Badge variant="outline">{b.status === 'active' ? '启用' : '停用'}</Badge></TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Edit2 className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteTarget(b)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button></TableCell></TableRow>)}
        </TableBody></Table></div>
      </TabsContent>
    </Tabs>

    <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editingBannerId ? '编辑活动' : '新增活动'}</DialogTitle></DialogHeader><div className="space-y-4"><Input value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} placeholder="活动标题" /><ImageUpload label="活动图片" value={bannerForm.imageUrl} onChange={(url) => setBannerForm({ ...bannerForm, imageUrl: url })} aspectRatio="aspect-video" /><Input value={bannerForm.linkUrl} onChange={(e) => setBannerForm({ ...bannerForm, linkUrl: e.target.value })} placeholder="跳转链接（可选）" /><Input type="number" value={bannerForm.sortOrder} onChange={(e) => setBannerForm({ ...bannerForm, sortOrder: Number(e.target.value) || 0 })} /><div className="flex items-center justify-between"><span>启用状态</span><Switch checked={bannerForm.status === 'active'} onCheckedChange={(v) => setBannerForm({ ...bannerForm, status: v ? 'active' : 'inactive' })} /></div></div><DialogFooter><Button variant="outline" onClick={() => setBannerDialogOpen(false)}>取消</Button><Button onClick={submitBanner} disabled={bannerSubmitting}>{bannerSubmitting ? '提交中...' : '确定'}</Button></DialogFooter></DialogContent></Dialog>
    <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>确认删除</AlertDialogTitle><AlertDialogDescription>确定删除活动「{deleteTarget?.title}」吗？</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={removeBanner} disabled={deleteLoading}>删除</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
};
export default AdminSettingsPage;
