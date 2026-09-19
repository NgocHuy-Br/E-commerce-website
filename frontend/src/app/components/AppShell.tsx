"use client";

import type { ReactNode } from "react";
import { CartProvider } from "../lib/cart";
import { ToastProvider, useToast } from "../lib/toast";
import { Header } from "./Header";

const toneClasses: Record<string, string> = {
  info: "border-slate-300 bg-white text-slate-700",
  success: "border-teal-600 bg-teal-50 text-teal-900",
  error: "border-rose-500 bg-rose-50 text-rose-800",
};

function ToastBanner() {
  const { toast, dismiss } = useToast();
  if (!toast) return null;
  return (
    <div className="fixed inset-x-0 top-20 z-50 flex justify-center px-4">
      <div
        className={`flex max-w-xl items-start gap-3 border px-4 py-3 text-sm shadow-md ${
          toneClasses[toast.tone]
        }`}
      >
        <span className="flex-1">{toast.message}</span>
        <button type="button" onClick={dismiss} className="text-xs font-semibold uppercase">
          Đóng
        </button>
      </div>
    </div>
  );
}

/** Khung chung: header, thông báo và footer cho mọi trang. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <CartProvider>
        <div className="flex min-h-screen flex-col bg-stone-50 text-slate-900">
          <Header />
          <ToastBanner />
          <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
          <footer className="border-t border-stone-200 bg-white py-5 text-center text-xs text-slate-400">
            Nhóm 14 · Thực tập · Nền tảng TMĐT microservices (Spring Boot + Next.js)
          </footer>
        </div>
      </CartProvider>
    </ToastProvider>
  );
}
