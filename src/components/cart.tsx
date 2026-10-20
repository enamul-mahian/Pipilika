"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { track } from "./analytics";

export type CartLine = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  image?: string | null;
  variantId?: string | null;
  variantName?: string | null;
  qty: number;
  unitPrice: number; // display only; server reprices
  options?: Record<string, string[] | Record<string, number> | string>;
  summary?: string;
  note?: string;
};

type Ctx = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (l: Omit<CartLine, "key">) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  ready: boolean;
};
const CartCtx = createContext<Ctx | null>(null);
const KEY = "pipilika_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {}
  }, [lines, ready]);

  const add = useCallback((l: Omit<CartLine, "key">) => {
    const key = l.productId + "|" + (l.variantId ?? "") + "|" + JSON.stringify(l.options ?? {}) + "|" + (l.note ?? "");
    setLines((cur) => {
      const ex = cur.find((c) => c.key === key);
      if (ex) return cur.map((c) => (c.key === key ? { ...c, qty: c.qty + l.qty } : c));
      return [...cur, { ...l, key }];
    });
    track("add_to_cart", { item_id: l.productId, item_name: l.name, value: l.unitPrice * l.qty, currency: "BDT" });
  }, []);
  const setQty = (key: string, qty: number) => setLines((c) => c.map((x) => (x.key === key ? { ...x, qty: Math.max(1, Math.min(99, qty)) } : x)));
  const remove = (key: string) => setLines((c) => c.filter((x) => x.key !== key));
  const clear = () => setLines([]);
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const subtotal = lines.reduce((a, l) => a + l.unitPrice * l.qty, 0);
  return <CartCtx.Provider value={{ lines, count, subtotal, add, setQty, remove, clear, ready }}>{children}</CartCtx.Provider>;
}

export const useCart = () => {
  const c = useContext(CartCtx);
  if (!c) throw new Error("CartProvider missing");
  return c;
};
