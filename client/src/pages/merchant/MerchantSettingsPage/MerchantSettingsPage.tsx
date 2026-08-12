import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import { Button } from '@client/src/components/ui/button';
import { Label } from '@client/src/components/ui/label';
import { merchantSettings as settingsApi } from '@client/src/api';
import type { ShopSettings } from '@shared/api.interface';

const defaultForm: Omit<ShopSettings, 'businessStatus'> = {
  shopName: '',
  shopLogoUrl: '',
  shopCoverUrl: '',
  shopDescription: '',
  businessStartTime: '08:00',
  businessEndTime: '22:00',
  deliveryFee: '0',
  minOrderAmount: '0',
};

const MerchantSettingsPage: React.FC = () => {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await settingsApi.getSettings();
      setForm({
        shopName: data.shopName,
        shopLogoUrl: data.shopLogoUrl,
        shopCoverUrl: data.shopCoverUrl,
        shopDescription: data.shopDescription,
        businessStartTime: data.businessStartTime,
        businessEndTime: data.businessEndTime,
        deliveryFee: data.deliveryFee,
        minOrderAmount: data.minOrderAmount,
      });
    } catch {
      toast.error('加载店铺设置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!form.shopName.trim()) {
      toast.error('请填写店铺名称');
      return;
    }
    try {
      setSaving(true);
      await settingsApi.saveSettings(form);
      toast.success('保存成功');
    } catch {
      toast.error('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">店铺设置</h1>
        <p className="text-sm text-muted-foreground mt-1">
          完善店铺信息，提升顾客信任
        </p>
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shopName">店铺名称</Label>
            <Input
              id="shopName"
              name="shopName"
              value={form.shopName}
              onChange={handleChange}
              placeholder="请输入店铺名称"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shopLogoUrl">店铺Logo URL</Label>
            <Input
              id="shopLogoUrl"
              name="shopLogoUrl"
              value={form.shopLogoUrl}
              onChange={handleChange}
              placeholder="请输入Logo图片链接"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shopCoverUrl">店铺封面URL</Label>
            <Input
              id="shopCoverUrl"
              name="shopCoverUrl"
              value={form.shopCoverUrl}
              onChange={handleChange}
              placeholder="请输入封面图链接"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shopDescription">店铺介绍</Label>
            <Textarea
              id="shopDescription"
              name="shopDescription"
              value={form.shopDescription}
              onChange={handleChange}
              placeholder="请输入店铺介绍"
              rows={4}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="text-base">营业设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessStartTime">营业开始时间</Label>
              <Input
                id="businessStartTime"
                name="businessStartTime"
                type="time"
                value={form.businessStartTime}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessEndTime">营业结束时间</Label>
              <Input
                id="businessEndTime"
                name="businessEndTime"
                type="time"
                value={form.businessEndTime}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deliveryFee">配送费（元）</Label>
              <Input
                id="deliveryFee"
                name="deliveryFee"
                type="number"
                value={form.deliveryFee}
                onChange={handleChange}
                placeholder="0.00"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minOrderAmount">起送金额（元）</Label>
              <Input
                id="minOrderAmount"
                name="minOrderAmount"
                type="number"
                value={form.minOrderAmount}
                onChange={handleChange}
                placeholder="0.00"
                disabled={loading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || loading}>
          {saving ? '保存中...' : '保存设置'}
        </Button>
      </div>
    </div>
  );
};

export default MerchantSettingsPage;
