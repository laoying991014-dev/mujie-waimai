import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/src/components/ui/dialog';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Switch } from '@client/src/components/ui/switch';
import { Button } from '@client/src/components/ui/button';
import { Label } from '@client/src/components/ui/label';
import ImageUpload from '@client/src/components/ImageUpload';
import { merchantProduct as productApi } from '@client/src/api';
import type { MerchantCategory } from '@shared/api.interface';

export interface ProductFormData {
  id?: string;
  name: string;
  description: string;
  price: string;
  stock: number;
  categoryId?: string;
  mainImageUrl: string;
  status: 'on_sale' | 'off_sale';
}

interface ProductEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: ProductFormData | null;
  categories: MerchantCategory[];
  onSaved: () => void;
}

const defaultForm: ProductFormData = {
  name: '',
  description: '',
  price: '0',
  stock: 0,
  categoryId: '',
  mainImageUrl: '',
  status: 'on_sale',
};

const ProductEditDialog: React.FC<ProductEditDialogProps> = ({
  open,
  onOpenChange,
  initialData,
  categories,
  onSaved,
}) => {
  const [form, setForm] = useState<ProductFormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initialData ?? defaultForm);
    }
  }, [open, initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('请输入商品名称');
      return;
    }
    if (!form.mainImageUrl.trim()) {
      toast.error('请上传商品主图');
      return;
    }
    const priceNum = Number(form.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      toast.error('请输入合法的商品价格');
      return;
    }
    const stockNum = Number(form.stock);
    if (Number.isNaN(stockNum) || stockNum < 0) {
      toast.error('请输入合法的库存数量');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        ...form,
        price: String(priceNum),
        stock: Math.floor(stockNum),
        categoryId: form.categoryId || undefined,
      };
      if (form.id) {
        await productApi.updateProduct(form.id, payload);
        toast.success('商品更新成功');
      } else {
        await productApi.createProduct(payload);
        toast.success('商品创建成功');
      }
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error('保存失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{form.id ? '编辑商品' : '新增商品'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">商品名称</Label>
            <Input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="请输入商品名称"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">商品描述</Label>
            <Textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="请输入商品描述"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">价格（元）</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">库存</Label>
              <Input
                id="stock"
                name="stock"
                type="number"
                min="0"
                value={String(form.stock)}
                onChange={handleChange}
                placeholder="0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="categoryId">所属分类</Label>
            <Select
              value={form.categoryId}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, categoryId: value }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择分类" />
              </SelectTrigger>
              <SelectContent>
                {categories.length === 0 && (
                  <SelectItem value="" disabled>
                    暂无分类，请先创建
                  </SelectItem>
                )}
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ImageUpload
            label="商品主图"
            value={form.mainImageUrl}
            onChange={(url) => setForm((prev) => ({ ...prev, mainImageUrl: url }))}
            aspectRatio="aspect-square"
          />
          <div className="flex items-center justify-between">
            <Label htmlFor="status">上架状态</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {form.status === 'on_sale' ? '已上架' : '已下架'}
              </span>
              <Switch
                id="status"
                checked={form.status === 'on_sale'}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({
                    ...prev,
                    status: checked ? 'on_sale' : 'off_sale',
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductEditDialog;
