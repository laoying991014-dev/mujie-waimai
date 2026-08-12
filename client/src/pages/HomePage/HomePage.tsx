import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Star,
  Flame,
  MapPin,
  Megaphone,
  Sparkles,
} from 'lucide-react';
import { Image } from '@client/src/components/ui/image';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { Badge } from '@client/src/components/ui/badge';
import * as homeApi from '@client/src/api/home';
import type {
  BannerItem,
  CategoryItem,
  HotProductItem,
  MerchantBrief,
  NoticeItem,
} from '@shared/api.interface';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [recommended, setRecommended] = useState<MerchantBrief[]>([]);
  const [nearby, setNearby] = useState<MerchantBrief[]>([]);
  const [hotProducts, setHotProducts] = useState<HotProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [noticeIndex, setNoticeIndex] = useState(0);

  const firstNotice = useMemo(() => notices[0] ?? null, [notices]);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const [catsRes, bannersRes, noticesRes, recRes, nearRes, hotRes] =
          await Promise.all([
            homeApi.getCategories(),
            homeApi.getBanners(),
            homeApi.getNotices(),
            homeApi.getRecommendedMerchants(),
            homeApi.getNearbyMerchants(10),
            homeApi.getHotProducts(10),
          ]);
        if (cancelled) return;
        setCategories(catsRes.items);
        setBanners(bannersRes.items);
        setNotices(noticesRes.items);
        setRecommended(recRes.items);
        setNearby(nearRes.items);
        setHotProducts(hotRes.items);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Banner auto-play
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = window.setInterval(() => {
      setBannerIndex((i) => (i + 1) % banners.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  // Notice rotation
  useEffect(() => {
    if (notices.length <= 1) return;
    const timer = window.setInterval(() => {
      setNoticeIndex((i) => (i + 1) % notices.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [notices.length]);

  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      {/* Categories */}
      <CategoryGrid categories={categories} loading={loading} />

      {/* Banner Carousel */}
      <BannerCarousel banners={banners} activeIndex={bannerIndex} loading={loading} onDotClick={setBannerIndex} />

      {/* Notice bar */}
      <NoticeBar notices={notices} notice={notices[noticeIndex]} loading={loading} />

      {/* Recommended Merchants */}
      <Section title="推荐商家" icon={<Sparkles className="w-4 h-4 text-primary" />}>
        {loading ? (
          <MerchantGridSkeleton count={6} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {recommended.map((m) => (
              <MerchantCard key={m.id} merchant={m} />
            ))}
          </div>
        )}
      </Section>

      {/* Nearby Merchants */}
      <Section
        title="附近商家"
        icon={<MapPin className="w-4 h-4 text-primary" />}
        action={
          <Link
            to="/merchants"
            className="text-xs text-muted-foreground flex items-center gap-0.5 hover:text-primary"
          >
            查看全部 <ChevronRight className="w-3 h-3" />
          </Link>
        }
      >
        {loading ? (
          <MerchantListSkeleton count={3} />
        ) : (
          <div className="flex flex-col gap-3">
            {nearby.map((m) => (
              <MerchantRowCard key={m.id} merchant={m} />
            ))}
          </div>
        )}
      </Section>

      {/* Hot Products */}
      <Section title="热门商品" icon={<Flame className="w-4 h-4 text-primary" />}>
        {loading ? (
          <ProductScrollSkeleton count={6} />
        ) : (
          <div className="-mx-4 px-4 overflow-x-auto scrollbar-none">
            <div className="flex gap-3 w-max">
              {hotProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </Section>
    </div>
  );
};

/* ---------- Sub components ---------- */

interface SectionProps {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, icon, action, children }) => (
  <section className="flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-base font-bold text-foreground">{title}</h2>
      </div>
      {action}
    </div>
    {children}
  </section>
);

/* --- Categories --- */

interface CategoryGridProps {
  categories: CategoryItem[];
  loading: boolean;
}

const CategoryGrid: React.FC<CategoryGridProps> = ({ categories, loading }) => {
  const navigate = useNavigate();
  if (loading) {
    return (
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton className="w-12 h-12 rounded-full" />
            <Skeleton className="w-10 h-3 rounded" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-5 gap-2">
      {categories.map((c) => (
        <button
          key={c.id}
          onClick={() => navigate(`/merchants?categoryId=${c.id}`)}
          className="flex flex-col items-center gap-1.5 py-1 group"
        >
          <div className="w-12 h-12 rounded-full bg-accent/60 flex items-center justify-center overflow-hidden group-active:scale-95 transition-transform">
            <Image
              src={c.iconUrl}
              alt={c.name}
              width={32}
              height={32}
              className="w-8 h-8 object-contain"
            />
          </div>
          <span className="text-xs text-foreground/80 line-clamp-1">{c.name}</span>
        </button>
      ))}
    </div>
  );
};

/* --- Banner Carousel --- */

interface BannerCarouselProps {
  banners: BannerItem[];
  activeIndex: number;
  loading: boolean;
  onDotClick: (i: number) => void;
}

const BannerCarousel: React.FC<BannerCarouselProps> = ({
  banners,
  activeIndex,
  loading,
  onDotClick,
}) => {
  if (loading) {
    return <Skeleton className="w-full h-36 rounded-xl" />;
  }
  if (banners.length === 0) return null;
  return (
    <div className="relative w-full rounded-xl overflow-hidden shadow-sm">
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {banners.map((b) => (
          <div key={b.id} className="min-w-full h-36 relative bg-muted">
            <Image
              src={b.imageUrl}
              alt={b.title}
              className="w-full h-full object-cover"
              sizes="(max-width: 640px) 100vw, 400px"
            />
          </div>
        ))}
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => onDotClick(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === activeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

/* --- Notice bar --- */

interface NoticeBarProps {
  notices: NoticeItem[];
  notice: NoticeItem | undefined;
  loading: boolean;
}

const NoticeBar: React.FC<NoticeBarProps> = ({ notices, notice, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-accent/40">
        <Skeleton className="w-4 h-4 rounded-full" />
        <Skeleton className="flex-1 h-3 rounded" />
      </div>
    );
  }
  if (notices.length === 0) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-accent/40">
      <Megaphone className="w-4 h-4 text-primary flex-shrink-0" />
      <div className="flex-1 overflow-hidden relative h-5">
        <div
          className="absolute inset-0 transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateY(${notice ? -notices.indexOf(notice) * 100 : 0}%)`,
          }}
        >
          {notices.map((n) => (
            <div key={n.id} className="h-5 leading-5 text-sm text-foreground/80 truncate">
              {n.title}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* --- Merchant Card (grid) --- */

const MerchantCard: React.FC<{ merchant: MerchantBrief }> = ({ merchant }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/shop/${merchant.id}`)}
      className="text-left bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
    >
      <div className="relative w-full aspect-[4/3] bg-muted overflow-hidden">
        <Image
          src={merchant.shopCoverUrl}
          alt={merchant.shopName}
          className="w-full h-full object-cover"
          sizes="200px"
        />
        {merchant.businessStatus === 'closed' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="secondary" className="text-xs">
              休息中
            </Badge>
          </div>
        )}
      </div>
      <div className="p-2.5 flex flex-col gap-1">
        <div className="text-sm font-semibold text-foreground truncate">{merchant.shopName}</div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="font-medium text-foreground/80">{merchant.rating.toFixed(1)}</span>
          </div>
          <span>月售 {merchant.monthSales}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>配送费</span>
          <span className="font-mono font-bold text-primary">¥{merchant.deliveryFee}</span>
        </div>
      </div>
    </button>
  );
};

/* --- Merchant Row Card (list) --- */

const MerchantRowCard: React.FC<{ merchant: MerchantBrief }> = ({ merchant }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/shop/${merchant.id}`)}
      className="w-full text-left flex gap-3 p-3 bg-card rounded-xl shadow-sm hover:shadow-md active:scale-[0.99] transition-all"
    >
      <div className="relative w-20 h-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
        <Image
          src={merchant.shopCoverUrl}
          alt={merchant.shopName}
          className="w-full h-full object-cover"
          sizes="80px"
        />
      </div>
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-foreground truncate">{merchant.shopName}</div>
          {merchant.businessStatus === 'closed' ? (
            <Badge variant="secondary" className="flex-shrink-0 text-xs">
              休息中
            </Badge>
          ) : (
            <Badge variant="default" className="flex-shrink-0 text-xs">
              营业中
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="font-medium text-foreground/80">{merchant.rating.toFixed(1)}</span>
          </div>
          <span>月售 {merchant.monthSales}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            配送费{' '}
            <span className="font-mono font-bold text-primary">¥{merchant.deliveryFee}</span>
          </span>
          <span>
            起送 <span className="font-mono text-foreground/80">¥{merchant.minOrderAmount}</span>
          </span>
        </div>
      </div>
    </button>
  );
};

/* --- Product Card --- */

const ProductCard: React.FC<{ product: HotProductItem }> = ({ product }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/shop/${product.merchantId}`)}
      className="w-32 flex-shrink-0 bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
    >
      <div className="relative w-full aspect-square bg-muted overflow-hidden">
        <Image
          src={product.mainImageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
          sizes="128px"
        />
        <div className="absolute top-1.5 left-1.5 bg-primary/90 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
          <Flame className="w-3 h-3" />
          热卖
        </div>
      </div>
      <div className="p-2 flex flex-col gap-1">
        <div className="text-xs font-medium text-foreground line-clamp-1">{product.name}</div>
        <div className="text-[10px] text-muted-foreground line-clamp-1">{product.merchantName}</div>
        <div className="flex items-baseline gap-1">
          <span className="text-xs text-primary font-mono font-bold">¥{product.price}</span>
          <span className="text-[10px] text-muted-foreground ml-auto">
            月售{product.monthSales}
          </span>
        </div>
      </div>
    </button>
  );
};

/* --- Skeletons --- */

const MerchantGridSkeleton: React.FC<{ count: number }> = ({ count }) => (
  <div className="grid grid-cols-2 gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex flex-col gap-2">
        <Skeleton className="w-full aspect-[4/3] rounded-xl" />
        <Skeleton className="w-3/4 h-4 rounded" />
        <Skeleton className="w-1/2 h-3 rounded" />
      </div>
    ))}
  </div>
);

const MerchantListSkeleton: React.FC<{ count: number }> = ({ count }) => (
  <div className="flex flex-col gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex gap-3 p-3 bg-card rounded-xl">
        <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
        <div className="flex-1 flex flex-col justify-between py-0.5">
          <Skeleton className="w-2/3 h-4 rounded" />
          <Skeleton className="w-1/2 h-3 rounded" />
          <Skeleton className="w-3/4 h-3 rounded" />
        </div>
      </div>
    ))}
  </div>
);

const ProductScrollSkeleton: React.FC<{ count: number }> = ({ count }) => (
  <div className="-mx-4 px-4 overflow-hidden">
    <div className="flex gap-3 w-max">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-32 flex-shrink-0 flex flex-col gap-2">
          <Skeleton className="w-full aspect-square rounded-xl" />
          <Skeleton className="w-3/4 h-3 rounded" />
          <Skeleton className="w-1/2 h-3 rounded" />
        </div>
      ))}
    </div>
  </div>
);

export default HomePage;
