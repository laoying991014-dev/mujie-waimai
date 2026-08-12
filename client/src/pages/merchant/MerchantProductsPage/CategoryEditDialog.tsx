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
import { Button } from '@client/src/components/ui/button';
import { Label } from '@client/src/components/ui/label';
import { merchantProduct as productApi } from '@client/src/api';

export interface CategoryFormData {
  id?: string;
  name: string;
  sortOrder: number;
}

interface CategoryEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: CategoryFormData | null;
  onSaved: () => void;
}

const defaultForm: CategoryFormData = {
  name: '',
  sortOrder: 0,
};

const CategoryEditDialog: React.FC<CategoryEditDialogProps> = ({
  open,
  onOpenChange,
  initialData,
  onSaved,
}) => {
  const [form, setForm] = useState<CategoryFormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initialData ?? defaultForm);
    }
  }, [open, initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'sortOrder' ? Number(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('请输入分类名称');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        name: form.name.trim(),
        sortOrder: Math.floor(Number(form.sortOrder) || 0),
      };
      if (form.id) {
        await productApi.updateCategory(form.id, payload);
        toast.success('分类更新成功');
      } else {
        await productApi.createCategory(payload);
        toast.success('分类创建成功');
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{form.id ? '编辑分类' : '新增分类'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">分类名称</Label>
            <Input
              id="cat-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="请输入分类名称"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-sort">排序号（数字越小越靠前）</Label>
            <Input
              id="cat-sort"
              name="sortOrder"
              type="number"
              value={String(form.sortOrder)}
              onChange={handleChange}
              placeholder="0"
            />
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

export default CategoryEditDialog;
