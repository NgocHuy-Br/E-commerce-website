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

  return useMemo(
    () => ({
      session,
      token: session?.accessToken ?? null,
      signIn,
      signOut,
      hasRole,
    }),
    [session, signIn, signOut, hasRole],
  );
}
