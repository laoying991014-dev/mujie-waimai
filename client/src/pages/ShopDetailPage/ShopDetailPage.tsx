import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  Clock,
  Plus,
  Minus,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Image } from '@client/src/components/ui/image';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { Badge } from '@client/src/components/ui/badge';
import * as shopApi from '@client/src/api/shop';
import {
  useCartStore,
  selectTotalCount,
  selectTotalPrice,
} from '@client/src/store/cart';
import type {
  MerchantCategory,
  ProductItem,
  ShopDetail,
} from '@shared/api.interface';

const ShopDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [categories, setCategories] = useState<MerchantCategory[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const productListRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const totalCount = useCartStore(selectTotalCount);
  const totalPrice = useCartStore(selectTotalPrice);
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const items = useCartStore((s) => s.items);
  const cartMerchantId = useCartStore((s) => s.merchantId);

  // Group products by category
  const productsByCategory = useMemo(() => {
    const map = new Map<string, ProductItem[]>();
    for (const p of products) {
      if (!map.has(p.categoryId)) map.set(p.categoryId, []);
      map.get(p.categoryId)!.push(p);
    }
    return map;
  }, [products]);

  // Load data
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);
        const [detailRes, productsRes] = await Promise.all([
          shopApi.getShopDetail(id),
          shopApi.getShopProducts(id),
        ]);
        if (cancelled) return;
        setShop(detailRes);
        setCategories(productsRes.categories);
        setProducts(productsRes.products);
        if (productsRes.categories.length > 0) {
          setActiveCategoryId(productsRes.categories[0].id);
        }
      } catch (err) {
        if (cancelled) return;
        logger.error('Load shop detail failed', err as Error);
        setError('加载失败，请稍后重试');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Scroll spy: determine active category based on scroll position
  const handleScroll = (): void => {
    const container = productListRef.current;
    if (!container) return;
    const scrollTop = container.scrollTop;
    const containerTop = container.getBoundingClientRect().top;

    let current = categories[0]?.id ?? '';
    for (const cat of categories) {
      const el = categoryRefs.current[cat.id];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      // element top relative to container top
      const relTop = rect.top - containerTop;
      if (relTop + scrollTop <= scrollTop + 10) {
        current = cat.id;
      }
    }
    if (current && current !== activeCategoryId) {
      setActiveCategoryId(current);
    }
  };

  // Click category → scroll to section
  const scrollToCategory = (catId: string): void => {
    setActiveCategoryId(catId);
    const el = categoryRefs.current[catId];
    const container = productListRef.current;
    if (!el || !container) return;
    const containerTop = container.getBoundingClientRect().top;
    const elTop = el.getBoundingClientRect().top;
    const targetScroll = container.scrollTop + (elTop - containerTop) - 8;
    container.scrollTo({ top: targetScroll, behavior: 'smooth' });
  };

  const handleAddToCart = (product: ProductItem): void => {
    if (!shop) return;
    addItem({
      id: product.id,
      name: product.name,
      imageUrl: product.mainImageUrl,
      price: product.price,
      merchantId: shop.id,
    });
  };

  const handleCheckout = (): void => {
    setDrawerOpen(false);
    navigate('/cart');
  };

  const canCheckout = totalCount > 0 && shop && cartMerchantId === shop.id;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Shop Header */}
      <ShopHeader
        shop={shop}
        loading={loading}
        onBack={() => navigate(-1)}
      />

      {/* Main: Category Sidebar + Product List */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Category Sidebar */}
        <aside
          className="w-[90px] flex-shrink-0 bg-card border-r border-border overflow-y-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          {loading ? (
            <CategorySidebarSkeleton />
          ) : (
            <ul className="py-1">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => scrollToCategory(cat.id)}
                    className={`w-full px-2 py-3 text-xs text-left transition-colors relative ${
                      activeCategoryId === cat.id
                        ? 'bg-background text-primary font-medium'
                        : 'text-foreground/70 hover:bg-accent/30'
                    }`}
                  >
                    {activeCategoryId === cat.id && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r" />
                    )}
                    <span className="block line-clamp-2 leading-tight">
                      {cat.name}
                    </span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5">
                      {productsByCategory.get(cat.id)?.length ?? 0} 件
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Right Product List */}
        <div
          ref={productListRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-3 py-3 pb-24"
        >
          {loading ? (
            <ProductListSkeleton />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm">{error}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm">暂无商品</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {categories.map((cat) => {
                const catProducts = productsByCategory.get(cat.id) ?? [];
                if (catProducts.length === 0) return null;
                return (
                  <div
                    key={cat.id}
                    ref={(el) => {
                      categoryRefs.current[cat.id] = el;
                    }}
                    className="flex flex-col gap-3"
                  >
                    <h3 className="text-sm font-bold text-foreground sticky top-0 bg-background/95 backdrop-blur py-2 -mx-3 px-3 z-10">
                      {cat.name}
                    </h3>
                    <div className="flex flex-col gap-3">
                      {catProducts.map((p) => (
                        <ProductRow
                          key={p.id}
                          product={p}
                          merchantId={shop?.id ?? ''}
                          onAdd={() => handleAddToCart(p)}
                          onUpdate={(q) => updateQuantity(p.id, q)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Cart Bar */}
      <CartBar
        totalCount={totalCount}
        totalPrice={totalPrice}
        minOrderAmount={shop?.minOrderAmount ?? '0'}
        canCheckout={!!canCheckout}
        onCartClick={() => setDrawerOpen(totalCount > 0)}
        onCheckout={handleCheckout}
      />

      {/* Cart Drawer */}
      <CartDrawer
        open={drawerOpen}
        items={items}
        onClose={() => setDrawerOpen(false)}
        onUpdateQuantity={updateQuantity}
        onRemove={removeItem}
        onClear={clearCart}
        onCheckout={handleCheckout}
      />
    </div>
  );
};

/* ---------- Shop Header ---------- */

interface ShopHeaderProps {
  shop: ShopDetail | null;
  loading: boolean;
  onBack: () => void;
}

const ShopHeader: React.FC<ShopHeaderProps> = ({ shop, loading, onBack }) => {
  if (loading) {
    return (
      <div className="relative bg-card">
        <Skeleton className="w-full h-44" />
        <div className="px-4 pb-4 -mt-10 relative">
          <div className="flex items-end gap-3">
            <Skeleton className="w-16 h-16 rounded-full border-4 border-card" />
            <div className="flex-1 pb-1">
              <Skeleton className="w-32 h-5 mb-1.5 rounded" />
              <Skeleton className="w-48 h-3 rounded" />
            </div>
          </div>
        </div>
        <button
          onClick={onBack}
          className="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center z-10"
          aria-label="返回"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (!shop) return null;

  return (
    <div className="relative bg-card">
      {/* Cover */}
      <div className="relative w-full h-44 overflow-hidden">
        <Image
          src={shop.shopCoverUrl}
          alt={shop.shopName}
          className="w-full h-full object-cover"
          sizes="(max-width: 640px) 100vw, 400px"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />
      </div>

      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center z-10 active:scale-95 transition-transform"
        aria-label="返回"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      {/* Shop info card */}
      <div className="px-4 pb-4 -mt-10 relative">
        <div className="flex items-end gap-3">
          <div className="w-16 h-16 rounded-full border-4 border-card overflow-hidden bg-muted flex-shrink-0 shadow-sm">
            <Image
              src={shop.shopLogoUrl}
              alt={shop.shopName}
              className="w-full h-full object-cover"
              width={64}
              height={64}
            />
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="text-lg font-bold text-foreground truncate">
              {shop.shopName}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <div className="flex items-center gap-0.5 text-xs">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span className="font-medium text-foreground">
                  {shop.rating.toFixed(1)}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                月售 {shop.monthSales}
              </span>
              <span className="text-xs text-muted-foreground">
                配送费 ¥{shop.deliveryFee}
              </span>
              <span className="text-xs text-muted-foreground">
                起送 ¥{shop.minOrderAmount}
              </span>
            </div>
          </div>
          <Badge
            variant={shop.businessStatus === 'open' ? 'default' : 'secondary'}
            className="flex-shrink-0"
          >
            {shop.businessStatus === 'open' ? '营业中' : '已打烊'}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>
            营业时间 {shop.businessStartTime} - {shop.businessEndTime}
          </span>
        </div>
        {shop.shopDescription && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
            {shop.shopDescription}
          </p>
        )}
      </div>
    </div>
  );
};

/* ---------- Product Row ---------- */

interface ProductRowProps {
  product: ProductItem;
  merchantId: string;
  onAdd: () => void;
  onUpdate: (q: number) => void;
}

const ProductRow: React.FC<ProductRowProps> = ({
  product,
  merchantId,
  onAdd,
  onUpdate,
}) => {
  const cartMerchantId = useCartStore((s) => s.merchantId);
  const quantity = useCartStore((s) =>
    cartMerchantId === merchantId
      ? s.items.find((it) => it.id === product.id)?.quantity ?? 0
      : 0,
  );
  return (
    <div className="flex gap-3 p-3 bg-card rounded-xl shadow-sm">
      <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
        <Image
          src={product.mainImageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
          width={80}
          height={80}
          sizes="80px"
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h4 className="text-sm font-medium text-foreground line-clamp-1">
            {product.name}
          </h4>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {product.description}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            月售 {product.monthSales}
          </p>
        </div>
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-0.5">
            <span className="text-xs text-primary font-mono">¥</span>
            <span className="text-base font-bold font-mono text-primary leading-none">
              {product.price}
            </span>
          </div>
          {quantity > 0 ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdate(quantity - 1)}
                className="w-6 h-6 rounded-full bg-accent text-primary flex items-center justify-center active:scale-90 transition-transform"
                aria-label="减少"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-sm font-medium text-foreground min-w-[20px] text-center font-mono">
                {quantity}
              </span>
              <button
                onClick={onAdd}
                className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                aria-label="增加"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onAdd}
              className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm active:scale-90 transition-transform"
              aria-label="加入购物车"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------- Cart Bar ---------- */

interface CartBarProps {
  totalCount: number;
  totalPrice: string;
  minOrderAmount: string;
  canCheckout: boolean;
  onCartClick: () => void;
  onCheckout: () => void;
}

const CartBar: React.FC<CartBarProps> = ({
  totalCount,
  totalPrice,
  minOrderAmount,
  canCheckout,
  onCartClick,
  onCheckout,
}) => {
  const reachMin = Number(totalPrice) >= Number(minOrderAmount);
  const checkoutDisabled = !canCheckout || !reachMin;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-30 md:bottom-0">
      <div className="max-w-lg mx-auto h-[60px] bg-card border-t border-border shadow-[0_-2px_8px_rgba(0_0_0_0.04)] flex items-center px-3 gap-3">
        {/* Cart icon */}
        <button
          onClick={onCartClick}
          disabled={totalCount === 0}
          className={`relative w-12 h-12 -mt-5 rounded-full flex items-center justify-center transition-all ${
            totalCount > 0
              ? 'bg-gradient-to-br from-[hsl(16_85%_58%)] to-[hsl(10_80%_52%)] text-primary-foreground shadow-md active:scale-95'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
          aria-label="购物车"
        >
          <ShoppingCart className="w-5 h-5" />
          {totalCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-primary text-[11px] font-bold flex items-center justify-center border border-primary/20 font-mono">
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          )}
        </button>

        {/* Price */}
        <div className="flex-1 min-w-0">
          {totalCount > 0 ? (
            <div className="flex items-baseline gap-0.5">
              <span className="text-xs text-primary font-mono">¥</span>
              <span className="text-xl font-bold font-mono text-primary leading-none">
                {totalPrice}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">未选购商品</span>
          )}
          {totalCount > 0 && !reachMin && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              还差 ¥{(Number(minOrderAmount) - Number(totalPrice)).toFixed(2)} 起送
            </p>
          )}
        </div>

        {/* Checkout button */}
        <button
          onClick={onCheckout}
          disabled={checkoutDisabled}
          className={`h-10 px-5 rounded-full text-sm font-medium transition-all ${
            checkoutDisabled
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-gradient-to-r from-[hsl(16_85%_58%)] to-[hsl(10_80%_52%)] text-primary-foreground shadow-md active:scale-95'
          }`}
        >
          {reachMin ? '去结算' : `¥${minOrderAmount} 起送`}
        </button>
      </div>
    </div>
  );
};

/* ---------- Cart Drawer ---------- */

interface CartDrawerProps {
  open: boolean;
  items: Array<{
    id: string;
    name: string;
    imageUrl: string;
    price: string;
    merchantId: string;
    quantity: number;
  }>;
  onClose: () => void;
  onUpdateQuantity: (id: string, q: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCheckout: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  items,
  onClose,
  onUpdateQuantity,
  onClear,
  onCheckout,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl shadow-xl max-h-[70vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-bold text-foreground">购物车</span>
          <button
            onClick={onClear}
            className="text-xs text-muted-foreground flex items-center gap-1 hover:text-destructive transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            清空
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {items.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              购物车是空的
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {items.map((item) => {
                const subtotal = (
                  Number(item.price) * item.quantity
                ).toFixed(2);
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 py-3 first:pt-2 last:pb-2"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        width={48}
                        height={48}
                        sizes="48px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-medium line-clamp-1">
                        {item.name}
                      </p>
                      <p className="text-xs text-primary font-mono mt-0.5">
                        ¥{subtotal}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 rounded-full bg-accent text-primary flex items-center justify-center active:scale-90 transition-transform"
                        aria-label="减少"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-medium text-foreground min-w-[20px] text-center font-mono">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                        aria-label="增加"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={onCheckout}
            disabled={items.length === 0}
            className={`h-10 px-6 rounded-full text-sm font-medium transition-all ${
              items.length === 0
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-gradient-to-r from-[hsl(16_85%_58%)] to-[hsl(10_80%_52%)] text-primary-foreground shadow-md active:scale-95'
            }`}
          >
            去结算
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
        .animate-slide-up { animation: slideUp 0.3s ease-out; }
      `}</style>
    </div>
  );
};

/* ---------- Skeletons ---------- */

const CategorySidebarSkeleton: React.FC = () => (
  <div className="py-2 px-2 flex flex-col gap-2">
    {Array.from({ length: 8 }).map((_, i) => (
      <Skeleton key={i} className="w-full h-10 rounded" />
    ))}
  </div>
);

const ProductListSkeleton: React.FC = () => (
  <div className="flex flex-col gap-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="flex flex-col gap-3">
        <Skeleton className="w-20 h-4 rounded" />
        {Array.from({ length: 3 }).map((__, j) => (
          <div key={j} className="flex gap-3 p-3 bg-card rounded-xl">
            <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
            <div className="flex-1 flex flex-col justify-between py-1">
              <div>
                <Skeleton className="w-3/4 h-4 rounded mb-1" />
                <Skeleton className="w-1/2 h-3 rounded" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="w-16 h-5 rounded" />
                <Skeleton className="w-7 h-7 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

export default ShopDetailPage;
