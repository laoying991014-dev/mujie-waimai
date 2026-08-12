import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Star,
  Clock,
  Bike,
  Package,
  Store,
} from 'lucide-react';
import { Image } from '@client/src/components/ui/image';
import { Skeleton } from '@client/src/components/ui/skeleton';
import * as shopApi from '@client/src/api/shop';
import * as homeApi from '@client/src/api/home';
import type { CategoryItem, MerchantBrief } from '@shared/api.interface';

type SortKey = 'default' | 'sales' | 'rating' | 'deliveryFee';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default', label: '综合' },
  { key: 'sales', label: '销量' },
  { key: 'rating', label: '评分' },
  { key: 'deliveryFee', label: '配送费' },
];

const MerchantListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCategoryId = searchParams.get('categoryId') ?? '';
  const urlKeyword = searchParams.get('keyword') ?? '';

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [merchants, setMerchants] = useState<MerchantBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [keyword, setKeyword] = useState(urlKeyword);
  const [activeCategoryId, setActiveCategoryId] = useState(urlCategoryId);
  const [sortBy, setSortBy] = useState<SortKey>('default');

  const debounceTimerRef = useRef<number | null>(null);

  // Load categories once
  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const res = await homeApi.getCategories();
        if (cancelled) return;
        setCategories(res.items);
      } finally {
        if (!cancelled) setCategoryLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load merchants when filters change
  const loadMerchants = useCallback(async () => {
    setLoading(true);
    try {
      const params: {
        page: number;
        pageSize: number;
        categoryId?: string;
        keyword?: string;
        sortBy: SortKey;
      } = {
        page: 1,
        pageSize: 50,
        sortBy,
      };
      if (activeCategoryId) params.categoryId = activeCategoryId;
      if (keyword.trim()) params.keyword = keyword.trim();
      const res = await shopApi.getMerchantList(params);
      setMerchants(res.items);
    } finally {
      setLoading(false);
    }
  }, [activeCategoryId, keyword, sortBy]);

  useEffect(() => {
    void loadMerchants();
  }, [loadMerchants]);

  // Debounced keyword search + sync URL
  const handleKeywordChange = (value: string): void => {
    setKeyword(value);
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (value.trim()) {
        next.set('keyword', value.trim());
      } else {
        next.delete('keyword');
      }
      setSearchParams(next, { replace: true });
    }, 300);
  };

  const handleCategoryClick = (categoryId: string): void => {
    setActiveCategoryId(categoryId);
    const next = new URLSearchParams(searchParams);
    if (categoryId) {
      next.set('categoryId', categoryId);
    } else {
      next.delete('categoryId');
    }
    setSearchParams(next, { replace: true });
  };

  const handleSortChange = (key: SortKey): void => {
    setSortBy(key);
  };

  const handleBack = (): void => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto flex flex-col">
        {/* Sticky search bar */}
        <div className="sticky top-0 z-20 bg-background border-b border-border shadow-sm">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <button
              onClick={handleBack}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-accent active:scale-95 transition-transform"
              aria-label="返回"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full bg-accent/50">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => handleKeywordChange(e.target.value)}
                placeholder="搜索商家或菜品"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
          </div>

          {/* Sticky filter bar */}
          <div className="border-t border-border/50">
            {/* Category scroll */}
            <div className="px-3 py-2 overflow-x-auto scrollbar-none">
              <div className="flex gap-2 w-max">
                <CategoryChip
                  label="全部"
                  active={activeCategoryId === ''}
                  loading={categoryLoading}
                  onClick={() => handleCategoryClick('')}
                />
                {categoryLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton
                        key={i}
                        className="h-7 w-16 rounded-full"
                      />
                    ))
                  : categories.map((c) => (
                      <CategoryChip
                        key={c.id}
                        label={c.name}
                        active={activeCategoryId === c.id}
                        onClick={() => handleCategoryClick(c.id)}
                      />
                    ))}
              </div>
            </div>
            {/* Sort bar */}
            <div className="flex items-center justify-around px-3 pb-2">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => handleSortChange(opt.key)}
                  className={`text-sm transition-colors ${
                    sortBy === opt.key
                      ? 'text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Merchant list */}
        <div className="flex-1 px-4 py-3 flex flex-col gap-3">
          {loading ? (
            <MerchantListSkeleton count={5} />
          ) : merchants.length === 0 ? (
            <EmptyState />
          ) : (
            merchants.map((m) => (
              <MerchantCard key={m.id} merchant={m} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------- Sub components ---------- */

interface CategoryChipProps {
  label: string;
  active: boolean;
  loading?: boolean;
  onClick: () => void;
}

const CategoryChip: React.FC<CategoryChipProps> = ({
  label,
  active,
  loading,
  onClick,
}) => {
  if (loading) {
    return <Skeleton className="h-7 w-16 rounded-full" />;
  }
  return (
    <button
      onClick={onClick}
      className={`px-3.5 h-7 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'bg-accent/40 text-foreground/80 hover:bg-accent'
      }`}
    >
      {label}
    </button>
  );
};

interface MerchantCardProps {
  merchant: MerchantBrief;
}

const MerchantCard: React.FC<MerchantCardProps> = ({ merchant }) => {
  const navigate = useNavigate();
  const isOpen = merchant.businessStatus === 'open';

  const handleClick = (): void => {
    navigate(`/shop/${merchant.id}`);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left rounded-xl shadow-sm bg-white overflow-hidden hover:shadow-md active:scale-[0.99] transition-all"
    >
      {/* Cover */}
      <div className="relative w-full aspect-video bg-muted">
        <Image
          src={merchant.shopCoverUrl}
          alt={merchant.shopName}
          className="w-full h-full object-cover"
          sizes="(max-width: 640px) 100vw, 400px"
        />
        {/* Status badge */}
        <div
          className={`absolute bottom-2 right-2 px-2.5 py-0.5 text-xs font-medium rounded-full text-white ${
            isOpen
              ? 'bg-emerald-500/90'
              : 'bg-muted-foreground/70'
          }`}
        >
          {isOpen ? '营业中' : '休息中'}
        </div>
      </div>
      {/* Info */}
      <div className="p-3 flex flex-col gap-2">
        <h3 className="text-base font-semibold text-foreground truncate">
          {merchant.shopName}
        </h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="font-medium text-foreground/80">
              {merchant.rating.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Package className="w-3.5 h-3.5" />
            <span>月售{merchant.monthSales}</span>
          </div>
          <div className="flex items-center gap-1">
            <Bike className="w-3.5 h-3.5" />
            <span
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
              className="font-bold text-primary"
            >
              ¥{merchant.deliveryFee}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>起送¥{merchant.minOrderAmount}</span>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>约30分钟</span>
          </div>
        </div>
      </div>
    </button>
  );
};

const MerchantListSkeleton: React.FC<{ count: number }> = ({ count }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="rounded-xl shadow-sm bg-white overflow-hidden"
      >
        <Skeleton className="w-full aspect-video rounded-none" />
        <div className="p-3 flex flex-col gap-2">
          <Skeleton className="h-5 w-2/3 rounded" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-12 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-14 rounded" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
        </div>
      </div>
    ))}
  </>
);

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <Store className="w-12 h-12 text-muted-foreground/50" />
    <p className="text-sm text-muted-foreground">暂无符合条件的商家</p>
    <p className="text-xs text-muted-foreground/70">换个分类或关键词试试吧</p>
  </div>
);

export default MerchantListPage;
