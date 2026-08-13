import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  LogOut,
  Package,
  MapPin,
  Info,
  Phone,
  ChevronRight,
  Edit2,
  Trash2,
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  Settings,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Image } from '@client/src/components/ui/image';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Switch } from '@client/src/components/ui/switch';
import ImageUpload from '@client/src/components/ImageUpload';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@client/src/components/ui/dialog';
import { useAuthStore } from '@client/src/store/auth';
import * as userApi from '@client/src/api/user';
import * as addressApi from '@client/src/api/address';
import type { AddressItem, UserProfile } from '@shared/api.interface';

type AddressFormData = {
  receiverName: string;
  receiverPhone: string;
  province: string;
  city: string;
  district: string;
  detailAddress: string;
  isDefault: boolean;
};

const emptyAddressForm: AddressFormData = {
  receiverName: '',
  receiverPhone: '',
  province: '',
  city: '',
  district: '',
  detailAddress: '',
  isDefault: false,
};

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, logout, setProfile } = useAuthStore();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [addressExpanded, setAddressExpanded] = useState(false);
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);

  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<AddressFormData>(emptyAddressForm);
  const [addressSaving, setAddressSaving] = useState(false);

  const [logoutOpen, setLogoutOpen] = useState(false);

  /* --- Profile --- */
  const loadProfile = useCallback(async (): Promise<void> => {
    try {
      setProfileLoading(true);
      const data = await userApi.getProfile();
      setUserProfile(data);
      setProfile(data);
    } catch (err) {
      logger.error('load profile failed', err);
    } finally {
      setProfileLoading(false);
    }
  }, [setProfile]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const openEditProfile = (): void => {
    if (!userProfile) return;
    setEditNickname(userProfile.nickname);
    setEditAvatarUrl(userProfile.avatarUrl);
    setEditOpen(true);
  };

  const handleSaveProfile = async (): Promise<void> => {
    try {
      setEditSaving(true);
      const updated = await userApi.updateProfile({
        nickname: editNickname.trim() || undefined,
        avatarUrl: editAvatarUrl.trim() || undefined,
      });
      setUserProfile(updated);
      setProfile(updated);
      setEditOpen(false);
    } catch (err) {
      logger.error('update profile failed', err);
    } finally {
      setEditSaving(false);
    }
  };

  /* --- Addresses --- */
  const loadAddresses = useCallback(async (): Promise<void> => {
    try {
      setAddressLoading(true);
      const res = await addressApi.getAddresses();
      setAddresses(res.items);
    } catch (err) {
      logger.error('load addresses failed', err);
    } finally {
      setAddressLoading(false);
    }
  }, []);

  useEffect(() => {
    if (addressExpanded) {
      void loadAddresses();
    }
  }, [addressExpanded, loadAddresses]);

  const openNewAddress = (): void => {
    setEditingAddressId(null);
    setAddressForm(emptyAddressForm);
    setAddressDialogOpen(true);
  };

  const openEditAddress = (addr: AddressItem): void => {
    setEditingAddressId(addr.id);
    setAddressForm({
      receiverName: addr.receiverName,
      receiverPhone: addr.receiverPhone,
      province: addr.province,
      city: addr.city,
      district: addr.district,
      detailAddress: addr.detailAddress,
      isDefault: addr.isDefault,
    });
    setAddressDialogOpen(true);
  };

  const handleSaveAddress = async (): Promise<void> => {
    if (!addressForm.receiverName.trim() || !addressForm.receiverPhone.trim()) {
      return;
    }
    try {
      setAddressSaving(true);
      if (editingAddressId) {
        await addressApi.updateAddress(editingAddressId, addressForm);
      } else {
        await addressApi.createAddress(addressForm);
      }
      setAddressDialogOpen(false);
      await loadAddresses();
    } catch (err) {
      logger.error('save address failed', err);
    } finally {
      setAddressSaving(false);
    }
  };

  const handleDeleteAddress = async (id: string): Promise<void> => {
    try {
      await addressApi.deleteAddress(id);
      await loadAddresses();
    } catch (err) {
      logger.error('delete address failed', err);
    }
  };

  const handleSetDefault = async (id: string): Promise<void> => {
    try {
      await addressApi.setDefaultAddress(id);
      await loadAddresses();
    } catch (err) {
      logger.error('set default address failed', err);
    }
  };

  const handleLogout = (): void => {
    logout();
    setLogoutOpen(false);
    window.dispatchEvent(
      new CustomEvent('auth:logout', { detail: { role: 'user' } }),
    );
  };

  const displayProfile = userProfile ?? profile;

  return (
    <div className="flex flex-col gap-4 px-4 py-3 pb-20">
      {/* User info card */}
      <div className="bg-gradient-to-br from-primary to-[hsl(10_80%_52%)] rounded-xl p-5 text-white shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center overflow-hidden ring-2 ring-white/30">
            {displayProfile?.avatarUrl ? (
              <Image
                src={displayProfile.avatarUrl}
                alt="avatar"
                width={64}
                height={64}
                className="w-full h-full object-cover"
                sizes="64px"
              />
            ) : (
              <User className="w-8 h-8 text-white/80" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold truncate">
              {profileLoading ? (
                <span className="inline-block w-24 h-5 bg-white/30 rounded animate-pulse" />
              ) : (
                displayProfile?.nickname || '美食爱好者'
              )}
            </div>
            <div className="text-sm opacity-90 mt-0.5">
              {profileLoading ? (
                <span className="inline-block w-28 h-4 bg-white/20 rounded animate-pulse" />
              ) : (
                displayProfile?.phone || ''
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={openEditProfile}
            className="border-white/30 text-white hover:bg-white/10"
          >
            <Edit2 className="w-3.5 h-3.5" />
            编辑资料
          </Button>
        </div>
      </div>

      {/* Menu list */}
      <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
        <MenuItem
          icon={<Package className="w-5 h-5 text-primary" />}
          label="我的订单"
          onClick={() => navigate('/orders')}
          arrow
        />
        <MenuItem
          icon={<MapPin className="w-5 h-5 text-primary" />}
          label="收货地址"
          onClick={() => setAddressExpanded((v) => !v)}
          rightIcon={
            addressExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )
          }
          noBorder={addressExpanded}
        />
        {addressExpanded && (
          <div className="border-t border-border/50 bg-muted/30 px-4 py-3">
            {addressLoading ? (
              <div className="space-y-2">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="bg-card rounded-lg p-3 border border-border/50"
                  >
                    <div className="h-4 w-32 bg-muted rounded mb-2 animate-pulse" />
                    <div className="h-3 w-48 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : addresses.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-4">
                暂无收货地址
              </div>
            ) : (
              <div className="space-y-2">
                {addresses.map((addr) => (
                  <AddressCard
                    key={addr.id}
                    address={addr}
                    onEdit={() => openEditAddress(addr)}
                    onDelete={() => handleDeleteAddress(addr.id)}
                    onSetDefault={() => handleSetDefault(addr.id)}
                  />
                ))}
              </div>
            )}
            <Button
              variant="outline"
              className="w-full mt-3 gap-1"
              onClick={openNewAddress}
            >
              <Plus className="w-4 h-4" />
              新增地址
            </Button>
          </div>
        )}
        <MenuItem
          icon={<Info className="w-5 h-5 text-primary" />}
          label="关于我们"
          onClick={() => {}}
          arrow
        />
        <MenuItem
          icon={<Phone className="w-5 h-5 text-primary" />}
          label="联系客服"
          onClick={() => {}}
          arrow
        />
      </div>

      {/* Logout */}
      <button
        onClick={() => setLogoutOpen(true)}
        className="w-full bg-card rounded-xl p-4 shadow-sm border border-border/50 flex items-center justify-center gap-2 text-destructive font-medium hover:bg-destructive/5 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        退出登录
      </button>

      {/* Edit profile dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑资料</DialogTitle>
            <DialogDescription>
              修改您的昵称和头像
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-foreground font-medium">昵称</label>
              <Input
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                placeholder="请输入昵称"
              />
            </div>
            <ImageUpload
              label="头像"
              value={editAvatarUrl}
              onChange={(url) => setEditAvatarUrl(url)}
              aspectRatio="aspect-square"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveProfile} disabled={editSaving}>
              {editSaving && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Address edit dialog */}
      <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAddressId ? '编辑地址' : '新增地址'}
            </DialogTitle>
            <DialogDescription>
              请填写完整的收货地址信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm text-foreground font-medium">
                  收货人
                </label>
                <Input
                  value={addressForm.receiverName}
                  onChange={(e) =>
                    setAddressForm((f) => ({
                      ...f,
                      receiverName: e.target.value,
                    }))
                  }
                  placeholder="收货人姓名"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-foreground font-medium">
                  手机号
                </label>
                <Input
                  value={addressForm.receiverPhone}
                  onChange={(e) =>
                    setAddressForm((f) => ({
                      ...f,
                      receiverPhone: e.target.value,
                    }))
                  }
                  placeholder="手机号码"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input
                value={addressForm.province}
                onChange={(e) =>
                  setAddressForm((f) => ({ ...f, province: e.target.value }))
                }
                placeholder="省份"
              />
              <Input
                value={addressForm.city}
                onChange={(e) =>
                  setAddressForm((f) => ({ ...f, city: e.target.value }))
                }
                placeholder="城市"
              />
              <Input
                value={addressForm.district}
                onChange={(e) =>
                  setAddressForm((f) => ({ ...f, district: e.target.value }))
                }
                placeholder="区县"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-foreground font-medium">
                详细地址
              </label>
              <Input
                value={addressForm.detailAddress}
                onChange={(e) =>
                  setAddressForm((f) => ({
                    ...f,
                    detailAddress: e.target.value,
                  }))
                }
                placeholder="街道、门牌号等"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-foreground">设为默认地址</span>
              <Switch
                checked={addressForm.isDefault}
                onCheckedChange={(checked) =>
                  setAddressForm((f) => ({ ...f, isDefault: checked }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddressDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleSaveAddress}
              disabled={
                addressSaving ||
                !addressForm.receiverName.trim() ||
                !addressForm.receiverPhone.trim()
              }
            >
              {addressSaving && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout confirm dialog */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认退出</DialogTitle>
            <DialogDescription>
              退出后需要重新登录才能继续使用
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              退出登录
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ---------- Sub components ---------- */

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  arrow?: boolean;
  rightIcon?: React.ReactNode;
  noBorder?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  label,
  onClick,
  arrow = false,
  rightIcon,
  noBorder = false,
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/50 ${
      noBorder ? '' : 'border-b border-border/50 last:border-b-0'
    }`}
  >
    {icon}
    <span className="flex-1 text-sm text-foreground">{label}</span>
    {rightIcon}
    {arrow && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
  </button>
);

interface AddressCardProps {
  address: AddressItem;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}

const AddressCard: React.FC<AddressCardProps> = ({
  address,
  onEdit,
  onDelete,
  onSetDefault,
}) => (
  <div className="bg-card rounded-lg p-3 border border-border/50">
    <div className="flex items-start gap-2 mb-2">
      <span className="text-sm font-medium text-foreground">
        {address.receiverName}
      </span>
      <span className="text-sm text-muted-foreground">
        {address.receiverPhone}
      </span>
      {address.isDefault && (
        <span className="ml-auto px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary/10 text-primary flex-shrink-0">
          默认
        </span>
      )}
    </div>
    <div className="text-sm text-foreground/80 mb-3 break-words">
      {address.province}
      {address.city}
      {address.district}
      {address.detailAddress}
    </div>
    <div className="flex items-center justify-between pt-2 border-t border-border/50">
      <button
        onClick={onSetDefault}
        className={`text-xs flex items-center gap-1 ${
          address.isDefault
            ? 'text-primary'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {address.isDefault ? (
          <>
            <Check className="w-3.5 h-3.5" />
            默认地址
          </>
        ) : (
          '设为默认'
        )}
      </button>
      <div className="flex items-center gap-3">
        <button
          onClick={onEdit}
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
        >
          <Edit2 className="w-3.5 h-3.5" />
          编辑
        </button>
        <button
          onClick={onDelete}
          className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          删除
        </button>
      </div>
    </div>
  </div>
);

// suppress unused
void Settings;

export default ProfilePage;
