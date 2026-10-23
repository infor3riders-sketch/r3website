"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { MAX_CART_LINES, MAX_LINE_QTY } from "@/lib/validators/shop";

export interface CartItem {
  variantId: string;
  productSlug: string;
  name: string;
  label: string;
  unitPrice: number;
  image: string | null;
  quantity: number;
  /** units available when added; the server re-checks at checkout */
  max: number;
}

const KEY = "r3-cart-v1";
const listeners = new Set<() => void>();

function read(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}
function write(items: CartItem[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable (private mode): cart lives only for this page view */
  }
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function parse(raw: string): CartItem[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((i) => i && typeof i.variantId === "string" && Number.isFinite(i.quantity) && Number.isFinite(i.unitPrice)) : [];
  } catch {
    return [];
  }
}

interface CartApi {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Server snapshot is an empty cart so SSR and the first client render match.
  const raw = useSyncExternalStore(subscribe, read, () => "[]");
  const items = useMemo(() => parse(raw), [raw]);

  const add = useCallback<CartApi["add"]>((item, qty = 1) => {
    const cur = parse(read());
    const existing = cur.find((i) => i.variantId === item.variantId);
    if (existing) existing.quantity = Math.min(existing.quantity + qty, MAX_LINE_QTY, item.max || MAX_LINE_QTY);
    else if (cur.length < MAX_CART_LINES) cur.push({ ...item, quantity: Math.min(qty, MAX_LINE_QTY, item.max || MAX_LINE_QTY) });
    write(cur);
  }, []);
  const setQty = useCallback((variantId: string, qty: number) => {
    const cur = parse(read())
      .map((i) => (i.variantId === variantId ? { ...i, quantity: Math.max(0, Math.min(qty, MAX_LINE_QTY)) } : i))
      .filter((i) => i.quantity > 0);
    write(cur);
  }, []);
  const remove = useCallback((variantId: string) => write(parse(read()).filter((i) => i.variantId !== variantId)), []);
  const clear = useCallback(() => write([]), []);

  const api = useMemo<CartApi>(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: items.reduce((n, i) => n + i.unitPrice * i.quantity, 0),
      add,
      setQty,
      remove,
      clear,
    }),
    [items, add, setQty, remove, clear],
  );
  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
