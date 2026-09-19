"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type Tone = "info" | "success" | "error";
type Toast = { message: string; tone: Tone } | null;

type ToastContextValue = {
  toast: Toast;
  notify: (message: string, tone?: Tone) => void;
  dismiss: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast>(null);

  const notify = useCallback((message: string, tone: Tone = "info") => {
    setToast({ message, tone });
  }, []);

  const dismiss = useCallback(() => setToast(null), []);

  const value = useMemo(() => ({ toast, notify, dismiss }), [toast, notify, dismiss]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast phải dùng bên trong ToastProvider");
  }
  return context;
}

/** Chỉ lấy hàm thông báo, dùng nhiều trong các component con. */
export function useNotify() {
  return useToast().notify;
}
