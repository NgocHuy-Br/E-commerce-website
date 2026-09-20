"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Tone = "info" | "success" | "error";
type Toast = { id: number; message: string; tone: Tone } | null;

/** Thông báo thành công/thông tin tự tắt nhanh, lỗi để lâu hơn cho kịp đọc. */
const HIDE_AFTER_MS: Record<Tone, number> = {
  info: 3000,
  success: 3000,
  error: 6000,
};

type ToastContextValue = {
  toast: Toast;
  notify: (message: string, tone?: Tone) => void;
  dismiss: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast>(null);
  const timerRef = useRef<number | null>(null);
  const counterRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setToast(null);
  }, [clearTimer]);

  const notify = useCallback(
    (message: string, tone: Tone = "info") => {
      clearTimer();
      counterRef.current += 1;
      const id = counterRef.current;
      setToast({ id, message, tone });
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        // Chỉ ẩn nếu chưa có thông báo mới thay thế.
        setToast((current) => (current?.id === id ? null : current));
      }, HIDE_AFTER_MS[tone]);
    },
    [clearTimer],
  );

  const value = useMemo(
    () => ({ toast, notify, dismiss }),
    [toast, notify, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
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
