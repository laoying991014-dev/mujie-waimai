import React, { useCallback, useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Ban,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@client/src/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Input } from '@client/src/components/ui/input';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import Image from '@client/src/components/ui/image';
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
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listProducts,
  forceOffProduct,
  getProductDetail,
} from '@client/src/api/admin-product';
import type {
  AdminProduct,
  ProductCategory,
  PaginatedResponse,
} from '@shared/api.interface';

const PAGE_SIZE = 10;

interface CategoryFormData {
  name: string;
  iconUrl: string;
  sortOrder: number;
  status: 'active' | 'inactive';
}

interface ProductDetailData extends AdminProduct {
  description: string;
  stock: number;
}

const AdminProductsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'products'>(
    'categories',
  );

  // ===== 分类管理状态 =====
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(
    null,
  );
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({
    name: '',
    iconUrl: '',
    sortOrder: 0,
    status: 'active',
  });
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [deleteCategoryTarget, setDeleteCategoryTarget] =
    useState<ProductCategory | null>(null);
  const [deleteCategoryLoading, setDeleteCategoryLoading] = useState(false);

  // ===== 商品管理状态 =====
  const [productsData, setProductsData] =
    useState<PaginatedResponse<AdminProduct> | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [status, setStatus] = useState<'all' | 'on_sale' | 'off_sale'>('all');

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<ProductDetailData | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);

  const [forceOffTarget, setForceOffTarget] = useState<AdminProduct | null>(
    null,
  );
  const [forceOffLoading, setForceOffLoading] = useState(false);

  // ===== 分类数据加载 =====
  const fetchCategories = useCallback(async (): Promise<void> => {
    try {
      setLoadingCategories(true);
      const data = await listCategories();
      setCategories(data.items);
    } catch {
      toast.error('加载分类失败');
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // ===== 商品数据加载 =====
  const fetchProducts = useCallback(async (): Promise<void> => {
    try {
      setLoadingProducts(true);
      const data = await listProducts({
        page,
        pageSize: PAGE_SIZE,
        categoryId: categoryId || undefined,
        keyword: keyword || undefined,
        status,
      });
      setProductsData(data);
    } catch {
      toast.error('加载商品列表失败');
    } finally {
      setLoadingProducts(false);
    }
  }, [page, categoryId, keyword, status]);

  useEffect(() => {
    if (activeTab === 'categories') {
      fetchCategories();
    }
  }, [activeTab, fetchCategories]);

  useEffect(() => {
    if (activeTab === 'products') {
      // 确保分类列表已加载（用于筛选下拉）
      if (categories.length === 0) {
        fetchCategories();
      }
      fetchProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, fetchProducts]);

  // ===== 分类操作 =====
  const openCreateCategory = (): void => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      iconUrl: '',
      sortOrder: categories.length,
      status: 'active',
    });
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (cat: ProductCategory): void => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      iconUrl: cat.iconUrl,
      sortOrder: cat.sortOrder,
      status: (cat.status as 'active' | 'inactive') ?? 'active',
    });
    setCategoryDialogOpen(true);
  };

  const handleCategorySubmit = async (): Promise<void> => {
    if (!categoryForm.name.trim()) {
      toast.error('请输入分类名称');
      return;
    }
    setCategorySubmitting(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: categoryForm.name.trim(),
          iconUrl: categoryForm.iconUrl.trim(),
          sortOrder: Number(categoryForm.sortOrder) || 0,
          status: categoryForm.status,
        });
        toast.success('更新成功');
      } else {
        await createCategory({
          name: categoryForm.name.trim(),
          iconUrl: categoryForm.iconUrl.trim(),
          sortOrder: Number(categoryForm.sortOrder) || 0,
        });
        toast.success('创建成功');
      }
      setCategoryDialogOpen(false);
      fetchCategories();
    } catch {
      toast.error('操作失败');
    } finally {
      setCategorySubmitting(false);
    }
  };

  const handleDeleteCategory = async (): Promise<void> => {
    if (!deleteCategoryTarget) return;
    setDeleteCategoryLoading(true);
    try {
      await deleteCategory(deleteCategoryTarget.id);
      toast.success('删除成功');
      setDeleteCategoryTarget(null);
      fetchCategories();
    } catch {
      toast.error('删除失败');
    } finally {
      setDeleteCategoryLoading(false);
    }
  };

  // ===== 商品操作 =====
  const handleSearch = (): void => {
    setPage(1);
    fetchProducts();
  };

  const handleCategoryFilter = (value: string): void => {
    setCategoryId(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string): void => {
    setStatus(value as 'all' | 'on_sale' | 'off_sale');
    setPage(1);
  };

  const handleViewDetail = async (product: AdminProduct): Promise<void> => {
    setDetailLoading(true);
    setDetailProduct(null);
    setDetailDialogOpen(true);
    try {
      const data = await getProductDetail(product.id);
      setDetailProduct(data);
    } catch {
      toast.error('加载商品详情失败');
      setDetailDialogOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleForceOff = async (): Promise<void> => {
    if (!forceOffTarget) return;
    setForceOffLoading(true);
    try {
      await forceOffProduct(forceOffTarget.id);
      toast.success('已强制下架');
      setForceOffTarget(null);
      fetchProducts();
    } catch {
      toast.error('强制下架失败');
    } finally {
      setForceOffLoading(false);
    }
  };

  const totalPages = productsData
    ? Math.max(1, Math.ceil(productsData.total / PAGE_SIZE))
    : 1;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">商品与分类管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理平台分类与全部商品
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
      >
        <TabsList>
          <TabsTrigger value="categories">
            <Tag className="w-4 h-4 mr-2" />
            平台分类管理
          </TabsTrigger>
          <TabsTrigger value="products">商品管理</TabsTrigger>
        </TabsList>

        {/* ========== 分类管理 Tab ========== */}
        <TabsContent value="categories" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-sm text-muted-foreground">
              共 {categories.length} 个分类
            </div>
            <div className="flex-1" />
            <Button onClick={openCreateCategory}>
              <Plus className="w-4 h-4 mr-1" />
              新增分类
            </Button>
          </div>

          {loadingCategories ? (
            <div className="py-16 text-center text-muted-foreground">
              加载中...
            </div>
          ) : categories.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              暂无分类，点击新增分类创建第一个分类
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat: ProductCategory) => (
                <div
                  key={cat.id}
                  className="bg-white rounded-xl p-4 shadow-sm border border-border/50 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-accent flex items-center justify-center flex-shrink-0">
                      {cat.iconUrl ? (
                        <Image
                          src={cat.iconUrl}
                          alt={cat.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Tag className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{cat.name}</h3>
                        <Badge
                          variant="outline"
                          className={
                            cat.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                          }
                        >
                          {cat.status === 'active' ? '启用' : '停用'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        排序号：{cat.sortOrder}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditCategory(cat)}
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteCategoryTarget(cat)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      删除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ========== 商品管理 Tab ========== */}
        <TabsContent value="products" className="space-y-4 mt-4">
          {/* 筛选栏 */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索商品名称"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <Select value={categoryId} onValueChange={handleCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="全部分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部分类</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="on_sale">上架中</SelectItem>
                <SelectItem value="off_sale">已下架</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch}>搜索</Button>
          </div>

          {/* 表格 */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px]">商品</TableHead>
                  <TableHead>所属商家</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead className="text-right">价格</TableHead>
                  <TableHead className="text-right">月销量</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right w-[200px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingProducts && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-8"
                    >
                      加载中...
                    </TableCell>
                  </TableRow>
                )}
                {!loadingProducts &&
                  productsData?.items.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground py-8"
                      >
                        暂无数据
                      </TableCell>
                    </TableRow>
                  )}
                {!loadingProducts &&
                  productsData?.items.map((p: AdminProduct) => (
                    <TableRow
                      key={p.id}
                      className={
                        p.status === 'off_sale'
                          ? 'text-muted-foreground opacity-70'
                          : ''
                      }
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            <Image
                              src={p.mainImageUrl}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="font-medium truncate max-w-[140px]">
                            {p.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{p.merchantName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.categoryName || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-primary">
                        ¥{p.price}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.monthSales}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            p.status === 'on_sale' ? 'default' : 'secondary'
                          }
                          className={
                            p.status === 'on_sale'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                          }
                        >
                          {p.status === 'on_sale' ? '上架中' : '已下架'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(p)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            详情
                          </Button>
                          {p.status === 'on_sale' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setForceOffTarget(p)}
                            >
                              <Ban className="w-3.5 h-3.5 mr-1" />
                              强制下架
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          {/* 分页 */}
          {productsData && productsData.total > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                共 {productsData.total} 条，第 {page} / {totalPages} 页
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
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ===== 分类编辑弹窗 ===== */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? '编辑分类' : '新增分类'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">分类名称</label>
              <Input
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, name: e.target.value })
                }
                placeholder="请输入分类名称"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">图标URL</label>
              <Input
                value={categoryForm.iconUrl}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, iconUrl: e.target.value })
                }
                placeholder="请输入图标图片地址"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">排序号</label>
              <Input
                type="number"
                value={categoryForm.sortOrder}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    sortOrder: parseInt(e.target.value, 10) || 0,
                  })
                }
              />
            </div>
            {editingCategory && (
              <div className="space-y-2">
                <label className="text-sm font-medium">状态</label>
                <Select
                  value={categoryForm.status}
                  onValueChange={(v) =>
                    setCategoryForm({
                      ...categoryForm,
                      status: v as 'active' | 'inactive',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">启用</SelectItem>
                    <SelectItem value="inactive">停用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCategoryDialogOpen(false)}
            >
              取消
            </Button>
            <Button onClick={handleCategorySubmit} disabled={categorySubmitting}>
              {categorySubmitting ? '提交中...' : '确定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== 分类删除确认 ===== */}
      <AlertDialog
        open={!!deleteCategoryTarget}
        onOpenChange={(o) => !o && setDeleteCategoryTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除分类「{deleteCategoryTarget?.name}」吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteCategoryLoading}
            >
              {deleteCategoryLoading ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== 商品详情弹窗 ===== */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>商品详情</DialogTitle>
          </DialogHeader>
          {detailLoading && (
            <div className="py-12 text-center text-muted-foreground">
              加载中...
            </div>
          )}
          {!detailLoading && detailProduct && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                  <Image
                    src={detailProduct.mainImageUrl}
                    alt={detailProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">
                    {detailProduct.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant={
                        detailProduct.status === 'on_sale'
                          ? 'default'
                          : 'secondary'
                      }
                      className={
                        detailProduct.status === 'on_sale'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                      }
                    >
                      {detailProduct.status === 'on_sale'
                        ? '上架中'
                        : '已下架'}
                    </Badge>
                  </div>
                  <div className="text-xl font-mono font-bold text-primary mt-2">
                    ¥{detailProduct.price}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">所属商家</div>
                  <div className="font-medium">{detailProduct.merchantName}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">所属分类</div>
                  <div className="font-medium">
                    {detailProduct.categoryName || '-'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">库存</div>
                  <div className="font-medium">{detailProduct.stock}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">月销量</div>
                  <div className="font-medium">{detailProduct.monthSales}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">商品描述</div>
                <div className="text-sm bg-muted/50 rounded-lg p-3 whitespace-pre-wrap min-h-[80px]">
                  {detailProduct.description || '暂无描述'}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== 强制下架确认 ===== */}
      <AlertDialog
        open={!!forceOffTarget}
        onOpenChange={(o) => !o && setForceOffTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认强制下架</AlertDialogTitle>
            <AlertDialogDescription>
              确定要强制下架商品「{forceOffTarget?.name}」吗？
              下架后该商品将不再对用户展示。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceOff}
              className="bg-destructive hover:bg-destructive/90"
              disabled={forceOffLoading}
            >
              {forceOffLoading ? '处理中...' : '强制下架'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminProductsPage;
