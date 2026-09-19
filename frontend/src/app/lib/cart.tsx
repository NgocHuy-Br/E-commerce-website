"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { api, errorMessage } from "./api";
import { useLoadEffect } from "./hooks";
import { useSession } from "./session";
import { useNotify } from "./toast";
import type { CartItem, Product } from "./types";

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (product: Product, quantity: number) => Promise<void>;
  setQuantity: (productId: number, quantity: number) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
  clear: () => void;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

/** Giỏ hàng dùng chung cho header, trang chủ, trang chi tiết và trang giỏ hàng. */
export function CartProvider({ children }: { children: ReactNode }) {
  const { token } = useSession();
  const notify = useNotify();
  const [items, setItems] = useState<CartItem[]>([]);

  const refresh = useCallback(async () => {
    if (!token) return;
    setItems(await api<CartItem[]>("/api/orders/cart", { token }).catch(() => [] as CartItem[]));
  }, [token]);

  useLoadEffect(refresh);

  const addItem = useCallback(
    async (product: Product, quantity: number) => {
      if (!token) {
        notify("Bạn cần đăng nhập để thêm vào giỏ hàng.", "error");
        return;
      }
      try {
        setItems(
          await api<CartItem[]>("/api/orders/cart/items", {
            method: "POST",
            token,
            body: { productId: product.id, quantity },
          }),
        );
        notify(`Đã thêm ${product.name} vào giỏ hàng.`, "success");
      } catch (error) {
        notify(errorMessage(error, "Không thể thêm vào giỏ hàng."), "error");
      }
    },
    [token, notify],
  );

  const setQuantity = useCallback(
    async (productId: number, quantity: number) => {
      try {
        setItems(
          await api<CartItem[]>(`/api/orders/cart/items/${productId}?quantity=${quantity}`, {
            method: "PUT",
            token,
          }),
        );
      } catch (error) {
        notify(errorMessage(error, "Không thể cập nhật giỏ hàng."), "error");
      }
    },
    [token, notify],
  );

  const removeItem = useCallback(
    async (productId: number) => {
      try {
        setItems(
          await api<CartItem[]>(`/api/orders/cart/items/${productId}`, { method: "DELETE", token }),
        );
      } catch (error) {
        notify(errorMessage(error, "Không thể xoá sản phẩm."), "error");
      }
    },
    [token, notify],
  );

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    // Đăng xuất thì không hiển thị giỏ của phiên trước.
    const visibleItems = token ? items : [];
    return {
      items: visibleItems,
      count: visibleItems.reduce((total, item) => total + item.quantity, 0),
      subtotal: visibleItems.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
      addItem,
      setQuantity,
      removeItem,
      clear,
      refresh,
    };
  }, [token, items, addItem, setQuantity, removeItem, clear, refresh]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart phải dùng bên trong CartProvider");
  }
  return context;
}
