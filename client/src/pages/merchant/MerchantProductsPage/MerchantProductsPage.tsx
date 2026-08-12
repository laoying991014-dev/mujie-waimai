import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@client/src/components/ui/tabs';
import { Card, CardContent } from '@client/src/components/ui/card';
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
import { Image } from '@client/src/components/ui/image';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@client/src/components/ui/pagination';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@client/src/components/ui/empty';
import { merchantProduct as productApi } from '@client/src/api';
import type { MerchantCategory, MerchantProduct } from '@shared/api.interface';
import ProductEditDialog, {
  type ProductFormData,
} from './ProductEditDialog';
import CategoryEditDialog, {
  type CategoryFormData,
} from './CategoryEditDialog';
import { showConfirm } from '@lark-apaas/client-toolkit';

const PAGE_SIZE = 10;

const MerchantProductsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>(
    'products',
  );

  // Product list state
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [status, setStatus] = useState<'all' | 'on_sale' | 'off_sale'>('all');
  const [products, setProducts] = useState<MerchantProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Categories state
  const [categories, setCategories] = useState<MerchantCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Dialogs
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productDialogData, setProductDialogData] =
    useState<ProductFormData | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryDialogData, setCategoryDialogData] =
    useState<CategoryFormData | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoadingCategories(true);
      const data = await productApi.getCategories();
      setCategories(data.items);
    } catch {
      toast.error('加载分类失败');
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const data = await productApi.getProducts({
        page,
        pageSize: PAGE_SIZE,
        categoryId: categoryId || undefined,
        keyword: keyword || undefined,
        status,
      });
      setProducts(data.items);
      setTotal(data.total);
    } catch {
      toast.error('加载商品列表失败');
    } finally {
      setLoadingProducts(false);
    }
  }, [page, categoryId, keyword, status]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts();
    }
  }, [activeTab, fetchProducts]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearch = () => {
    setPage(1);
    fetchProducts();
  };

  const handleCategoryFilter = (val: string) => {
    setCategoryId(val);
    setPage(1);
  };

  const handleStatusFilter = (val: string) => {
    setStatus(
      val === 'on_sale' || val === 'off_sale' ? val : 'all',
    );
    setPage(1);
  };

  const handleAddProduct = () => {
    setProductDialogData(null);
    setProductDialogOpen(true);
  };

  const handleEditProduct = (p: MerchantProduct) => {
    // Find categoryId via name match (best-effort; fallback to empty)
    const matchedCategory = categories.find(
      (c) => c.name === p.categoryName,
    );
    setProductDialogData({
      id: p.id,
      name: p.name,
      description: '',
      price: p.price,
      stock: p.stock,
      categoryId: matchedCategory?.id,
      mainImageUrl: p.mainImageUrl,
      status: p.status,
    });
    setProductDialogOpen(true);
  };

  const handleToggleStatus = async (
    p: MerchantProduct,
    newStatus: 'on_sale' | 'off_sale',
  ) => {
    try {
      await productApi.updateProductStatus(p.id, newStatus);
      toast.success(
        newStatus === 'on_sale' ? '已上架' : '已下架',
      );
      fetchProducts();
    } catch {
      toast.error('操作失败');
    }
  };

  const handleDeleteProduct = async (p: MerchantProduct) => {
    if (!await showConfirm(`确定删除商品「${p.name}」吗？`)) return;
    try {
      await productApi.deleteProduct(p.id);
      toast.success('删除成功');
      fetchProducts();
    } catch {
      toast.error('删除失败');
    }
  };

  const handleAddCategory = () => {
    setCategoryDialogData({
      name: '',
      sortOrder: categories.length,
    });
    setCategoryDialogOpen(true);
  };

  const handleEditCategory = (c: MerchantCategory) => {
    setCategoryDialogData({
      id: c.id,
      name: c.name,
      sortOrder: c.sortOrder,
    });
    setCategoryDialogOpen(true);
  };

  const handleDeleteCategory = async (c: MerchantCategory) => {
    if (!await showConfirm(`确定删除分类「${c.name}」吗？该分类下的商品将解除分类关联。`))
      return;
    try {
      await productApi.deleteCategory(c.id);
      toast.success('删除成功');
      fetchCategories();
      if (categoryId === c.id) {
        setCategoryId('');
      }
    } catch {
      toast.error('删除失败');
    }
  };

  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;
    const current = categories[index];
    const target = categories[targetIndex];
    try {
      // Swap sortOrders
      await Promise.all([
        productApi.updateCategory(current.id, {
          name: current.name,
          sortOrder: target.sortOrder,
        }),
        productApi.updateCategory(target.id, {
          name: target.name,
          sortOrder: current.sortOrder,
        }),
      ]);
      toast.success('排序已更新');
      fetchCategories();
    } catch {
      toast.error('排序更新失败');
    }
  };

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  const onProductSaved = () => {
    fetchProducts();
  };

  const onCategorySaved = () => {
    fetchCategories();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">商品管理</h1>
        <p className="text-sm text-muted-foreground mt-1">
          管理您的商品和分类
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="products">商品列表</TabsTrigger>
          <TabsTrigger value="categories">分类管理</TabsTrigger>
        </TabsList>

        {/* Products tab */}
        <TabsContent value="products" className="space-y-4 mt-2">
          <Card className="shadow-sm border-border">
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="搜索商品名称"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearch();
                    }}
                  />
                </div>
                <Select
                  value={categoryId}
                  onValueChange={handleCategoryFilter}
                >
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
                    <SelectItem value="on_sale">已上架</SelectItem>
                    <SelectItem value="off_sale">已下架</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex-1" />
                <Button onClick={handleAddProduct}>
                  <Plus className="size-4 mr-1" />
                  添加商品
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border">
            <CardContent className="p-0">
              {loadingProducts ? (
                <div className="p-12 text-center text-muted-foreground">
                  加载中...
                </div>
              ) : products.length === 0 ? (
                <div className="p-12">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Search className="size-6" />
                      </EmptyMedia>
                      <EmptyTitle>暂无商品</EmptyTitle>
                      <EmptyDescription>
                        还没有商品，点击添加商品创建第一个商品
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button onClick={handleAddProduct}>添加商品</Button>
                    </EmptyContent>
                  </Empty>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">图片</TableHead>
                        <TableHead>商品名称</TableHead>
                        <TableHead>分类</TableHead>
                        <TableHead className="text-right">价格</TableHead>
                        <TableHead className="text-right">库存</TableHead>
                        <TableHead className="text-right">月销量</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className="text-right w-[220px]">
                          操作
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="relative size-12 overflow-hidden rounded-lg bg-muted">
                              <Image
                                src={p.mainImageUrl}
                                alt={p.name}
                                width={48}
                                height={48}
                                className="object-cover size-12"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {p.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {p.categoryName || '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-primary">
                            ¥{p.price}
                          </TableCell>
                          <TableCell className="text-right">
                            {p.stock}
                          </TableCell>
                          <TableCell className="text-right">
                            {p.monthSales}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                p.status === 'on_sale'
                                  ? 'outline'
                                  : 'secondary'
                              }
                              className={
                                p.status === 'on_sale'
                                  ? 'text-success border-success/30 bg-success/10'
                                  : ''
                              }
                            >
                              {p.status === 'on_sale' ? '上架中' : '已下架'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditProduct(p)}
                              >
                                <Pencil className="size-3.5 mr-1" />
                                编辑
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleToggleStatus(
                                    p,
                                    p.status === 'on_sale'
                                      ? 'off_sale'
                                      : 'on_sale',
                                  )
                                }
                              >
                                {p.status === 'on_sale' ? '下架' : '上架'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => handleDeleteProduct(p)}
                              >
                                <Trash2 className="size-3.5 mr-1" />
                                删除
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-border">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() =>
                                setPage((p) => Math.max(1, p - 1))
                              }
                              className={
                                page <= 1
                                  ? 'pointer-events-none opacity-50 cursor-not-allowed'
                                  : 'cursor-pointer'
                              }
                            />
                          </PaginationItem>
                          {pageNumbers.map((n) => (
                            <PaginationItem key={n}>
                              <PaginationLink
                                isActive={n === page}
                                onClick={() => setPage(n)}
                                className="cursor-pointer"
                              >
                                {n}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext
                              onClick={() =>
                                setPage((p) =>
                                  Math.min(totalPages, p + 1),
                                )
                              }
                              className={
                                page >= totalPages
                                  ? 'pointer-events-none opacity-50 cursor-not-allowed'
                                  : 'cursor-pointer'
                              }
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories tab */}
        <TabsContent value="categories" className="space-y-4 mt-2">
          <Card className="shadow-sm border-border">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  共 {categories.length} 个分类
                </div>
                <Button onClick={handleAddCategory}>
                  <Plus className="size-4 mr-1" />
                  新增分类
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border">
            <CardContent className="p-0">
              {loadingCategories ? (
                <div className="p-12 text-center text-muted-foreground">
                  加载中...
                </div>
              ) : categories.length === 0 ? (
                <div className="p-12">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <ArrowUpDown className="size-6" />
                      </EmptyMedia>
                      <EmptyTitle>暂无分类</EmptyTitle>
                      <EmptyDescription>
                        创建分类来组织您的商品
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button onClick={handleAddCategory}>新增分类</Button>
                    </EmptyContent>
                  </Empty>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">排序</TableHead>
                      <TableHead>分类名称</TableHead>
                      <TableHead className="w-[120px]">排序号</TableHead>
                      <TableHead className="text-right w-[240px]">
                        操作
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((c, index) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              disabled={index === 0}
                              onClick={() => handleMoveCategory(index, 'up')}
                              aria-label="上移"
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              disabled={index === categories.length - 1}
                              onClick={() => handleMoveCategory(index, 'down')}
                              aria-label="下移"
                            >
                              <ArrowDown className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {c.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono">
                          {c.sortOrder}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditCategory(c)}
                            >
                              <Pencil className="size-3.5 mr-1" />
                              编辑
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => handleDeleteCategory(c)}
                            >
                              <Trash2 className="size-3.5 mr-1" />
                              删除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ProductEditDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        initialData={productDialogData}
        categories={categories}
        onSaved={onProductSaved}
      />
      <CategoryEditDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        initialData={categoryDialogData}
        onSaved={onCategorySaved}
      />
    </div>
  );
};

export default MerchantProductsPage;
