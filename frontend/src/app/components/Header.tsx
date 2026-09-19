"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "../lib/cart";
import { useSession } from "../lib/session";
import { useNotify } from "../lib/toast";

const customerNavItems = [
  { href: "/orders", label: "Đơn hàng của tôi" },
  { href: "/seller", label: "Kênh người bán" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, signOut, isAdmin, isCustomer } = useSession();
  const { count } = useCart();
  const notify = useNotify();

  // Quản trị viên chỉ thấy khu quản trị; khách thấy đơn hàng và kênh người bán.
  const items = [
    { href: "/", label: "Trang chủ" },
    ...(isCustomer ? customerNavItems : []),
    ...(isAdmin ? [{ href: "/admin", label: "Quản trị" }] : []),
  ];
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-4">
        <Link href="/" className="mr-2">
          <span className="block text-lg font-semibold text-slate-900">
            Mua Sắm Nhom14
          </span>
          <span className="block text-xs text-slate-500">
            Sàn TMĐT microservices
          </span>
        </Link>

        <nav className="flex flex-1 flex-wrap items-center gap-1">
          {items.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-teal-700 text-white"
                    : "text-slate-700 hover:bg-stone-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {/* Tài khoản quản trị không có giỏ hàng. */}
          {!isAdmin && (
            <Link
              href="/cart"
              className="relative border border-stone-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-stone-100"
            >
              Giỏ hàng
              <span className="ml-2 inline-flex min-w-5 justify-center bg-amber-500 px-1.5 text-xs font-semibold text-slate-900">
                {count}
              </span>
            </Link>
          )}

          {session ? (
            <>
              <Link
                href="/account"
                className="max-w-40 truncate px-3 py-2 text-sm text-slate-600 hover:text-teal-800"
                title={`${session.email} (${session.roles.join(", ")})`}
              >
                {isAdmin ? `${session.email} · Quản trị viên` : session.email}
              </Link>
              <button
                type="button"
                onClick={() => {
                  signOut();
                  notify("Đã đăng xuất.", "info");
                  router.push("/");
                }}
                className="border border-stone-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-stone-100"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <Link
              href={loginHref}
              className="bg-teal-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-teal-800"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
