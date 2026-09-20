"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { keepDigitsOnly } from "../lib/validate";

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`border border-stone-200 bg-white p-5 shadow-sm ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {typeof title === "string" ? (
            <h2 className="text-base font-semibold">{title}</h2>
          ) : (
            title
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled = false,
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "accent" | "danger" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const styles: Record<string, string> = {
    primary: "bg-teal-700 text-white hover:bg-teal-800",
    secondary: "border border-teal-700 text-teal-800 hover:bg-teal-50",
    accent: "bg-amber-500 text-slate-900 hover:bg-amber-400",
    danger: "border border-rose-500 text-rose-600 hover:bg-rose-50",
    ghost: "border border-stone-300 text-slate-700 hover:bg-stone-100",
  };
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: ReactNode;
  /** Thông báo lỗi hiện ngay dưới ô nhập. */
  error?: string | null;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
      {error && (
        <span className="mt-1 block text-xs text-rose-600">{error}</span>
      )}
    </label>
  );
}

const controlClass =
  "w-full border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600";

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  onEnter,
  digitsOnly = false,
  invalid = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  onEnter?: () => void;
  /** Ô chỉ cho nhập số: mọi ký tự khác chữ số đều bị bỏ ngay khi gõ. */
  digitsOnly?: boolean;
  invalid?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      inputMode={digitsOnly ? "numeric" : undefined}
      onChange={(event) =>
        onChange(
          digitsOnly ? keepDigitsOnly(event.target.value) : event.target.value,
        )
      }
      onKeyDown={(event) => {
        if (event.key === "Enter" && onEnter) onEnter();
      }}
      className={`${controlClass} ${invalid ? "border-rose-500" : ""}`}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={controlClass}
    />
  );
}

export function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={controlClass}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

const badgeStyles: Record<string, string> = {
  neutral: "bg-stone-100 text-slate-600",
  success: "bg-teal-50 text-teal-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-rose-50 text-rose-700",
  info: "bg-sky-50 text-sky-800",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof badgeStyles;
}) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium ${badgeStyles[tone]}`}
    >
      {children}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-4 text-sm text-slate-500">{children}</p>;
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  // Cho phép đóng hộp thoại bằng phím Esc.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="mt-10 w-full max-w-2xl border border-stone-200 bg-white shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function StatTile({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="border border-stone-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

/** Nút quay lại trang trước. */
export function BackButton({ label = "Quay lại" }: { label?: string }) {
  const router = useRouter();
  return (
    <Button variant="ghost" onClick={() => router.back()}>
      ← {label}
    </Button>
  );
}

export function PageHeader({
  title,
  description,
  back = true,
  action,
}: {
  title: string;
  description?: string;
  back?: boolean;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        {back && (
          <div className="mb-2">
            <BackButton />
          </div>
        )}
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Nhắc đăng nhập cho các trang cần quyền. */
export function RequireLogin({
  next,
  message,
}: {
  next: string;
  message?: string;
}) {
  return (
    <Card>
      <p className="text-sm text-slate-600">
        {message ?? "Bạn cần đăng nhập để xem nội dung này."}
      </p>
      <Link
        href={`/login?next=${encodeURIComponent(next)}`}
        className="mt-3 inline-block bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800"
      >
        Đăng nhập
      </Link>
    </Card>
  );
}

/** Chặn tài khoản quản trị dùng các chức năng mua/bán của khách. */
export function AdminNotAllowed({ feature }: { feature: string }) {
  return (
    <Card>
      <p className="text-sm text-slate-700">
        Tài khoản quản trị viên là tài khoản nội bộ nên không sử dụng {feature}.
      </p>
      <p className="mt-2 text-sm text-slate-500">
        Nếu bạn muốn mua hàng hoặc mở cửa hàng, hãy dùng một tài khoản khách
        riêng.
      </p>
      <Link
        href="/admin"
        className="mt-3 inline-block bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800"
      >
        Về khu quản trị
      </Link>
    </Card>
  );
}
