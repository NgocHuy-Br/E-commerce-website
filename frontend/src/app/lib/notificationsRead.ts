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

/** Ghi nhớ thông báo đã đọc trên trình duyệt, tách riêng theo tài khoản. */
export function useReadNotifications() {
  const { session } = useSession();
  const key = `nhom14.notifications.read.${session?.userId ?? "guest"}`;
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => "[]",
  );

  const readIds = useMemo<Set<string>>(() => {
    try {
      const parsed = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
    } catch {
      return new Set();
    }
  }, [raw]);

  const markRead = useCallback(
    (ids: string[]) => {
      let current: string[] = [];
      try {
        current = JSON.parse(read(key)) as string[];
      } catch {
        current = [];
      }
      // Giữ tối đa 200 mã gần nhất để không phình dữ liệu.
      const next = [...new Set([...current, ...ids])].slice(-200);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Trình duyệt chặn lưu trữ: bỏ qua.
      }
      listeners.forEach((listener) => listener());
    },
    [key],
  );

  return { readIds, markRead };
}
