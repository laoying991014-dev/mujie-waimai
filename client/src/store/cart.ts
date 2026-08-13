import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartProduct {
  id: string;
  name: string;
  imageUrl: string;
  price: string;
  merchantId: string;
  quantity: number;
  cartItemId?: string; // 后端购物车项ID
}

interface CartState {
  items: CartProduct[];
  merchantId: string | null;
  addItem: (product: Omit<CartProduct, 'quantity'>) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  setCartItemId: (productId: string, cartItemId: string) => void;
}

const computeTotalCount = (items: CartProduct[]): number =>
  items.reduce((sum: number, it: CartProduct) => sum + it.quantity, 0);

const computeTotalPrice = (items: CartProduct[]): string => {
  const total = items.reduce((sum: number, it: CartProduct) => {
    return sum + Number(it.price) * it.quantity;
  }, 0);
  return total.toFixed(2);
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      merchantId: null,
      addItem: (product) => {
        const { items, merchantId } = get();
        // If switching merchant, clear previous cart (simplified: direct override)
        if (merchantId && merchantId !== product.merchantId) {
          set({
            items: [{ ...product, quantity: 1 }],
            merchantId: product.merchantId,
          });
          return;
        }
        const existing = items.find((it: CartProduct) => it.id === product.id);
        if (existing) {
          set({
            items: items.map((it: CartProduct) =>
              it.id === product.id ? { ...it, quantity: it.quantity + 1 } : it,
            ),
          });
        } else {
          set({
            items: [...items, { ...product, quantity: 1 }],
            merchantId: product.merchantId,
          });
        }
      },
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set({
          items: get().items.map((it: CartProduct) =>
            it.id === id ? { ...it, quantity } : it,
          ),
        });
      },
      removeItem: (id) => {
        const next = get().items.filter((it: CartProduct) => it.id !== id);
        set({
          items: next,
          merchantId: next.length === 0 ? null : get().merchantId,
        });
      },
      clearCart: () => set({ items: [], merchantId: null }),
      setCartItemId: (productId, cartItemId) => {
        set({
          items: get().items.map((it: CartProduct) =>
            it.id === productId ? { ...it, cartItemId } : it,
          ),
        });
      },
    }),
    {
      name: 'mujie-cart-storage',
    },
  ),
);

// Derived selectors
export const selectTotalCount = (state: CartState): number =>
  computeTotalCount(state.items);

export const selectTotalPrice = (state: CartState): string =>
  computeTotalPrice(state.items);

export const selectItemQuantity =
  (id: string) =>
  (state: CartState): number =>
    state.items.find((it: CartProduct) => it.id === id)?.quantity ?? 0;
