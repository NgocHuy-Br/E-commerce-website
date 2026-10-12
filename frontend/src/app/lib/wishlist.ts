"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useSession } from "./session";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function read(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "[]";
  } catch {
    return "[]";
  }
}

/** Danh sách yêu thích lưu trên trình duyệt, tách riêng theo từng tài khoản. */
export function useWishlist() {
  const { session } = useSession();
  const key = `nhom14.wishlist.${session?.userId ?? "guest"}`;
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => "[]",
  );

  const ids = useMemo<number[]>(() => {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "number") : [];
    } catch {
      return [];
    }
  }, [raw]);

  const toggle = useCallback(
    (productId: number) => {
      const current: number[] = (() => {
        try {
          return JSON.parse(read(key)) as number[];
        } catch {
          return [];
        }
      })();
      const next = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [productId, ...current];
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Trình duyệt chặn lưu trữ: bỏ qua.
      }
      listeners.forEach((listener) => listener());
    },
    [key],
  );

  return { ids, has: (productId: number) => ids.includes(productId), toggle };
}
