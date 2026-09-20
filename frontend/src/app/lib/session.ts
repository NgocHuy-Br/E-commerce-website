"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { AuthResponse, Role } from "./types";

const STORAGE_KEY = "nhom14.session";

export type Notify = (
  message: string,
  tone?: "info" | "success" | "error",
) => void;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Đọc phiên đăng nhập từ localStorage; dùng useSyncExternalStore để không lệch khi hydrate. */
function getSnapshot(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

/**
 * Xoá phiên đăng nhập khi token không còn hợp lệ.
 * Gọi được từ ngoài React (lib/api.ts) vì dữ liệu phiên nằm ở localStorage.
 */
export function expireSession() {
  try {
    if (!window.localStorage.getItem(STORAGE_KEY)) {
      return false;
    }
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return false;
  }
  emit();
  return true;
}

export function useSession() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const session = useMemo<AuthResponse | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthResponse;
    } catch {
      return null;
    }
  }, [raw]);

  const signIn = useCallback((next: AuthResponse) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Trình duyệt chặn localStorage: bỏ qua, người dùng cần đăng nhập lại sau khi tải lại trang.
    }
    emit();
  }, []);

  const signOut = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Bỏ qua.
    }
    emit();
  }, []);

  const hasRole = useCallback(
    (role: Role) => Boolean(session?.roles?.includes(role)),
    [session],
  );

  return useMemo(() => {
    const roles = session?.roles ?? [];
    return {
      session,
      token: session?.accessToken ?? null,
      signIn,
      signOut,
      hasRole,
      /** Quản trị viên là tài khoản nội bộ: không mua hàng, không bán hàng. */
      isAdmin: roles.includes("ADMIN"),
      /** Tài khoản khách: được mua hàng và mở cửa hàng. */
      isCustomer: roles.includes("BUYER"),
    };
  }, [session, signIn, signOut, hasRole]);
}
