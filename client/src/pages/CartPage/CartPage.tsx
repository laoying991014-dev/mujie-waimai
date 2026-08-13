import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Plus,
  Minus,
  ChevronRight,
  Store,
  Trash2,
  Pencil,
} from 'lucide-react';
import { Image } from '@client/src/components/ui/image';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import { Switch } from '@client/src/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@client/src/components/ui/dialog';
import { useAuthStore } from '@client/src/store/auth';
import { useCartStore } from '@client/src/store/cart';
import * as cartApi from '@client/src/api/cart';
import * as addressApi from '@client/src/api/address';
import * as orderApi from '@client/src/api/order';
import type { AddressItem, CartInfo, CartItem } from '@shared/api.interface';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);

  const [cart, setCart] = useState<CartInfo | null>(null);
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(true);
  const [addressListOpen, setAddressListOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isLoggedIn = Boolean(token);
  const localCartItems = useCartStore((s) => s.items);
  const clearLocalCart = useCartStore((s) => s.clearCart);

  /* ---------- Load data ---------- */
  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      setLoading(true);
      try {
        if (isLoggedIn) {
          let cartRes = await cartApi.getCart();
          // 如果后端购物车为空但本地有数据，自动同步到后端
          if (cartRes.items.length === 0 && localCartItems.length > 0) {
            for (const item of localCartItems) {
              await cartApi.addToCart(item.id, item.quantity);
            }
            // 重新获取后端购物车
            cartRes = await cartApi.getCart();
            // 清空本地购物车，避免重复
            clearLocalCart();
          }
          if (cancelled) return;
          const addrRes = await addressApi.getAddresses();
          if (cancelled) return;
          setCart(cartRes);
          setAddresses(addrRes.items);
          const defaultAddr = addrRes.items.find((a) => a.isDefault) ?? addrRes.items[0] ?? null;
          setSelectedAddressId(defaultAddr?.id ?? null);
        } else {
          setCart(null);
          setAddresses([]);
          setSelectedAddressId(null);
        }
      } catch (err) {
        logger.error('load cart failed', JSON.stringify(err));
        toast.error('加载失败，请重试');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId],
  );

  /* ---------- Derived amounts ---------- */
  const productTotal = useMemo(() => {
    if (!cart) return 0;
    return cart.items.reduce((sum: number, it: CartItem) => sum + Number(it.subtotal), 0);
  }, [cart]);

  const deliveryFee = useMemo(() => {
    if (!cart) return 0;
    return Number(cart.deliveryFee) || 0;
  }, [cart]);

  const totalAmount = productTotal + deliveryFee;

  /* ---------- Quantity handlers ---------- */
  const handleUpdateQty = async (itemId: string, qty: number): Promise<void> => {
    if (qty < 1) return;
    try {
      await cartApi.updateCartItem(itemId, qty);
      setCart((prev) => {
        if (!prev) return prev;
        const items = prev.items.map((it) =>
          it.id === itemId
            ? { ...it, quantity: qty, subtotal: (Number(it.price) * qty).toFixed(2) }
            : it,
        );
        const productTotalStr = items
          .reduce((sum, it) => sum + Number(it.subtotal), 0)
          .toFixed(2);
        return { ...prev, items, productTotal: productTotalStr };
      });
    } catch (err) {
      logger.error('update cart item failed', JSON.stringify(err));
      toast.error('数量更新失败');
    }
  };

  const handleRemoveItem = async (itemId: string): Promise<void> => {
    try {
      await cartApi.removeCartItem(itemId);
      setCart((prev) => {
        if (!prev) return prev;
        const items = prev.items.filter((it) => it.id !== itemId);
        const productTotalStr = items
          .reduce((sum, it) => sum + Number(it.subtotal), 0)
          .toFixed(2);
        return { ...prev, items, productTotal: productTotalStr };
      });
    } catch (err) {
      logger.error('remove cart item failed', JSON.stringify(err));
      toast.error('删除失败');
    }
  };

  /* ---------- Address actions ---------- */
  const handleAddressClick = (): void => {
    if (!isLoggedIn) {
      toast.error('请先登录');
      return;
    }
    if (addresses.length > 1) {
      setAddressListOpen(true);
    } else {
      setEditingAddress(null);
      setDialogOpen(true);
    }
  };

  const handleSelectAddress = (addr: AddressItem): void => {
    setSelectedAddressId(addr.id);
    setAddressListOpen(false);
  };

  const handleEditAddress = (addr: AddressItem): void => {
    setEditingAddress(addr);
    setAddressListOpen(false);
    setDialogOpen(true);
  };

  const handleSaveAddress = async (form: Omit<AddressItem, 'id'>): Promise<void> => {
    try {
      if (editingAddress) {
        const updated = await addressApi.updateAddress(editingAddress.id, form);
        setAddresses((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        if (updated.isDefault) {
          setAddresses((prev) =>
            prev.map((a) => (a.id === updated.id ? a : { ...a, isDefault: false })),
          );
        }
        toast.success('地址已更新');
      } else {
        const created = await addressApi.createAddress(form);
        setAddresses((prev) => [...prev, created]);
        if (created.isDefault || addresses.length === 0) {
          setSelectedAddressId(created.id);
        }
        toast.success('地址已添加');
      }
      setDialogOpen(false);
      setEditingAddress(null);
    } catch (err) {
      logger.error('save address failed', JSON.stringify(err));
      toast.error('保存失败');
    }
  };

  const handleDeleteAddress = async (id: string): Promise<void> => {
    try {
      await addressApi.deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      if (selectedAddressId === id) {
        const rest = addresses.filter((a) => a.id !== id);
        setSelectedAddressId(rest[0]?.id ?? null);
      }
      toast.success('已删除');
    } catch (err) {
      logger.error('delete address failed', JSON.stringify(err));
      toast.error('删除失败');
    }
  };

  const handleSetDefault = async (id: string): Promise<void> => {
    try {
      await addressApi.setDefaultAddress(id);
      setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    } catch (err) {
      logger.error('set default address failed', JSON.stringify(err));
      toast.error('设置失败');
    }
  };

  /* ---------- Submit order ---------- */
  const handleSubmitOrder = async (): Promise<void> => {
    if (!isLoggedIn) {
      toast.error('请先登录后再下单');
      navigate('/login');
      return;
    }
    if (!selectedAddressId) {
      toast.error('请选择收货地址');
      return;
    }
    if (!cart || cart.items.length === 0) {
      toast.error('购物车是空的');
      return;
    }
    setSubmitting(true);
    try {
      const result = await orderApi.createOrder(selectedAddressId, remark.trim() || undefined);
      await cartApi.clearCart();
      toast.success('下单成功');
      navigate(`/orders/${result.orderId}`);
    } catch (err) {
      logger.error('create order failed', JSON.stringify(err));
      toast.error('下单失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Render ---------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="p-4 text-sm text-muted-foreground">加载中...</div>
      </div>
    );
  }

  const empty = !isLoggedIn || !cart || cart.items.length === 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <TopBar />

      {/* Login prompt */}
      {!isLoggedIn && (
        <div className="mx-4 mt-3 p-4 bg-accent/60 rounded-xl text-sm">
          <div className="text-foreground font-medium">请先登录查看购物车</div>
          <div className="text-muted-foreground text-xs mt-1">登录后可同步购物车与地址信息</div>
          <Button
            variant="default"
            size="sm"
            className="mt-3 rounded-full bg-gradient-to-r from-[hsl(16_85%_58%)] to-[hsl(10_80%_52%)] border-0"
            onClick={() => navigate('/login')}
          >
            去登录
          </Button>
        </div>
      )}

      {/* Address section */}
      <section className="px-4 pt-3">
        <div
          onClick={handleAddressClick}
          className="bg-card rounded-xl p-4 shadow-sm border border-border/50 flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-transform"
        >
          <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          {selectedAddress ? (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground truncate">
                  {selectedAddress.receiverName}
                </span>
                <span className="text-muted-foreground text-sm">
                  {selectedAddress.receiverPhone}
                </span>
                {selectedAddress.isDefault && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary flex-shrink-0">
                    默认
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-0.5 truncate">
                {selectedAddress.detailAddress}
              </div>
            </div>
          ) : (
            <div className="flex-1 text-muted-foreground">新增收货地址</div>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </div>
      </section>

      {/* Merchant + items */}
      {!empty && cart && (
        <section className="px-4 pt-3">
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
            <div className="flex items-center gap-2 pb-3 border-b border-border/50">
              <Store className="w-4 h-4 text-primary" />
              <span className="font-medium text-foreground">{cart.merchantName}</span>
            </div>
            <div>
              {cart.items.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 py-3 ${
                    idx === cart.items.length - 1 ? '' : 'border-b border-border/50'
                  }`}
                >
                  <Image
                    src={item.productImageUrl}
                    alt={item.productName}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-muted"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground font-medium line-clamp-2">
                      {item.productName}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-mono font-bold text-primary">
                        ¥{Number(item.price).toFixed(2)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-foreground disabled:opacity-40 active:scale-90 transition-transform"
                          aria-label="减少"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm w-5 text-center font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                          className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-90 transition-transform"
                          aria-label="增加"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="ml-1 text-muted-foreground hover:text-destructive"
                          aria-label="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty cart */}
      {!loading && empty && isLoggedIn && (
        <div className="px-4 pt-16 flex flex-col items-center text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-accent/60 flex items-center justify-center mb-3">
            <Store className="w-7 h-7 text-primary/60" />
          </div>
          <div className="text-sm">购物车还是空的</div>
          <Button
            variant="default"
            size="sm"
            className="mt-4 rounded-full bg-gradient-to-r from-[hsl(16_85%_58%)] to-[hsl(10_80%_52%)] border-0"
            onClick={() => navigate('/')}
          >
            去逛逛
          </Button>
        </div>
      )}

      {/* Remark */}
      {!empty && (
        <section className="px-4 pt-3">
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
            <div className="text-sm font-medium text-foreground mb-2">订单备注</div>
            <Textarea
              placeholder="口味、忌口等备注（选填）"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              maxLength={200}
              className="resize-none bg-background/60"
              rows={3}
            />
          </div>
        </section>
      )}

      {/* Fee detail */}
      {!empty && (
        <section className="px-4 pt-3">
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">商品合计</span>
              <span className="font-mono text-foreground">¥{productTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">配送费</span>
              <span className="font-mono text-foreground">¥{deliveryFee.toFixed(2)}</span>
            </div>
            <div className="h-px bg-border/50 my-2" />
            <div className="flex justify-between items-baseline">
              <span className="text-foreground font-medium">合计</span>
              <span className="font-mono font-bold text-primary text-xl">
                ¥{totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Bottom submit bar */}
      {!empty && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-t border-border/50">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-sm text-muted-foreground">合计：</span>
              <span className="font-mono font-bold text-primary text-xl">
                ¥{totalAmount.toFixed(2)}
              </span>
            </div>
            <Button
              onClick={handleSubmitOrder}
              disabled={submitting || !selectedAddressId}
              className="rounded-full bg-gradient-to-r from-[hsl(16_85%_58%)] to-[hsl(10_80%_52%)] text-white font-medium px-8 min-h-11 border-0"
            >
              {submitting ? '提交中...' : '提交订单'}
            </Button>
          </div>
        </div>
      )}

      {/* Address list drawer */}
      <AddressListDialog
        open={addressListOpen}
        addresses={addresses}
        selectedId={selectedAddressId}
        onClose={() => setAddressListOpen(false)}
        onSelect={handleSelectAddress}
        onEdit={handleEditAddress}
        onDelete={handleDeleteAddress}
        onSetDefault={handleSetDefault}
        onAdd={() => {
          setEditingAddress(null);
          setAddressListOpen(false);
          setDialogOpen(true);
        }}
      />

      {/* Address edit dialog */}
      <AddressEditDialog
        open={dialogOpen}
        editing={editingAddress}
        onClose={() => {
          setDialogOpen(false);
          setEditingAddress(null);
        }}
        onSave={handleSaveAddress}
      />
    </div>
  );
};

/* ---------- Top bar ---------- */
const TopBar: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/50">
      <div className="max-w-lg mx-auto px-4 h-12 flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 -ml-2 flex items-center justify-center text-foreground"
          aria-label="返回"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="flex-1 text-center text-base font-semibold text-foreground pr-8">
          确认订单
        </h1>
      </div>
    </div>
  );
};

/* ---------- Address list dialog ---------- */
interface AddressListDialogProps {
  open: boolean;
  addresses: AddressItem[];
  selectedId: string | null;
  onClose: () => void;
  onSelect: (addr: AddressItem) => void;
  onEdit: (addr: AddressItem) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  onAdd: () => void;
}

const AddressListDialog: React.FC<AddressListDialogProps> = ({
  open,
  addresses,
  selectedId,
  onClose,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
  onAdd,
}) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[75vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>选择收货地址</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {addresses.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-6">暂无地址</div>
          )}
          {addresses.map((addr) => (
            <div
              key={addr.id}
              onClick={() => onSelect(addr)}
              className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                selectedId === addr.id
                  ? 'border-primary bg-accent/40'
                  : 'border-border/60 bg-card hover:bg-accent/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground truncate">{addr.receiverName}</span>
                <span className="text-sm text-muted-foreground">{addr.receiverPhone}</span>
                {addr.isDefault && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary flex-shrink-0">
                    默认
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {addr.detailAddress}
              </div>
              <div className="flex items-center justify-between mt-2">
                <div
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Switch
                    checked={addr.isDefault}
                    onCheckedChange={() => onSetDefault(addr.id)}
                  />
                  <span>设为默认</span>
                </div>
                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onEdit(addr)}
                    className="text-xs text-primary flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" /> 编辑
                  </button>
                  <button
                    onClick={() => onDelete(addr.id)}
                    className="text-xs text-destructive flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> 删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button
            variant="default"
            onClick={onAdd}
            className="rounded-full bg-gradient-to-r from-[hsl(16_85%_58%)] to-[hsl(10_80%_52%)] border-0 w-full"
          >
            <Plus className="w-4 h-4" /> 新增收货地址
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ---------- Address edit dialog ---------- */
interface AddressEditDialogProps {
  open: boolean;
  editing: AddressItem | null;
  onClose: () => void;
  onSave: (form: Omit<AddressItem, 'id'>) => void;
}

const AddressEditDialog: React.FC<AddressEditDialogProps> = ({
  open,
  editing,
  onClose,
  onSave,
}) => {
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (open) {
      if (editing) {
        setReceiverName(editing.receiverName);
        setReceiverPhone(editing.receiverPhone);
        setDetailAddress(editing.detailAddress);
        setIsDefault(editing.isDefault);
      } else {
        setReceiverName('');
        setReceiverPhone('');
        setDetailAddress('');
        setIsDefault(false);
      }
      setError('');
    }
  }, [open, editing]);

  const handleSubmit = (): void => {
    if (!receiverName.trim()) return setError('请输入收货人姓名');
    if (!/^(1[3-9]\d{9}|09\d{8})$/.test(receiverPhone.trim())) return setError('请输入正确的手机号');
    if (!detailAddress.trim()) return setError('请输入收货地址');
    onSave({
      receiverName: receiverName.trim(),
      receiverPhone: receiverPhone.trim(),
      province: '',
      city: '',
      district: '',
      detailAddress: detailAddress.trim(),
      isDefault,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑地址' : '新增地址'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">收货人</label>
            <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="请输入收货人姓名" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">手机号</label>
            <Input value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} placeholder="请输入手机号" maxLength={11} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">收货地址</label>
            <Textarea
              value={detailAddress}
              onChange={(e) => setDetailAddress(e.target.value)}
              placeholder="请输入完整收货地址，如：木姐市XX路XX号"
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-foreground">设为默认地址</span>
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          </div>
          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
        <DialogFooter className="flex-row gap-2">
          <DialogClose asChild>
            <Button variant="outline" className="flex-1 rounded-full">取消</Button>
          </DialogClose>
          <Button
            variant="default"
            onClick={handleSubmit}
            className="flex-1 rounded-full bg-gradient-to-r from-[hsl(16_85%_58%)] to-[hsl(10_80%_52%)] border-0"
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CartPage;
