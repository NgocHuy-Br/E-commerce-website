"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { api } from "../lib/api";
import { useCart } from "../lib/cart";
import { useSession } from "../lib/session";
import { useNotify } from "../lib/toast";
import { ORDER_STATUS_LABELS } from "../lib/order";
import type { Order, Store } from "../lib/types";

type NotificationItem = { id: string; title: string; detail: string; href: string };

const customerNavItems = [
  { href: "/orders", label: "Đơn hàng của tôi" },
  { href: "/seller", label: "Kênh người bán" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, signOut, isAdmin, isCustomer } = useSession();
  const { token, hasRole } = useSession();
  const { count } = useCart();
  const notify = useNotify();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      return;
    }
    const [buyerOrders, sellerOrders, pendingStores, adminOrders] = await Promise.all([
      hasRole("BUYER") ? api<Order[]>("/api/orders/mine", { token }).catch(() => []) : Promise.resolve([]),
      hasRole("SELLER") ? api<Order[]>("/api/orders/seller", { token }).catch(() => []) : Promise.resolve([]),
      isAdmin ? api<Store[]>("/api/stores/admin?status=PENDING", { token }).catch(() => []) : Promise.resolve([]),
      isAdmin ? api<Order[]>("/api/orders/admin", { token }).catch(() => []) : Promise.resolve([]),
    ]);
    const next: NotificationItem[] = [];

    for (const order of buyerOrders) {
      if (order.paymentStatus === "PENDING" && order.status !== "CANCELLED") {
        next.push({ id: `pay-${order.id}`, title: `Đơn #${order.id} cần thanh toán`, detail: "Hoàn tất thanh toán để tiếp tục đơn hàng.", href: "/orders" });
      } else if (["PENDING", "CONFIRMED", "PACKING", "SHIPPING"].includes(order.status)) {
        next.push({ id: `track-${order.id}`, title: `Đơn #${order.id}: ${ORDER_STATUS_LABELS[order.status]}`, detail: "Trạng thái đơn mua của bạn vừa được cập nhật.", href: "/orders" });
      } else if (order.status === "DELIVERED" && order.items.some((item) => !item.reviewed)) {
        next.push({ id: `review-${order.id}`, title: `Đơn #${order.id} đã giao`, detail: "Bạn có thể đánh giá sản phẩm đã mua.", href: "/orders" });
      }
    }

    for (const order of sellerOrders) {
      if (order.status === "PENDING") {
        next.push({ id: `seller-${order.id}`, title: `Đơn #${order.id} cần xác nhận`, detail: "Kiểm tra và xác nhận đơn hàng mới.", href: "/seller" });
      } else if (order.status === "CONFIRMED" || order.status === "PACKING") {
        next.push({ id: `seller-${order.id}`, title: `Đơn #${order.id} cần xử lý`, detail: `Đơn đang ở trạng thái ${ORDER_STATUS_LABELS[order.status].toLowerCase()}.`, href: "/seller" });
      }
    }

    for (const store of pendingStores.slice(0, 3)) {
      next.push({ id: `store-${store.id}`, title: `Cửa hàng chờ duyệt: ${store.name}`, detail: "Có yêu cầu mở cửa hàng cần xem xét.", href: "/admin" });
    }
    const pendingOrderCount = adminOrders.filter((order) => order.status === "PENDING").length;
    if (pendingOrderCount > 0) {
      next.push({ id: "admin-orders", title: `${pendingOrderCount} đơn hàng chờ xử lý`, detail: "Xem danh sách đơn hàng toàn sàn.", href: "/admin" });
    }

    setNotifications(next.slice(0, 8));
  }, [hasRole, isAdmin, token]);

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
          {!isAdmin && !pathname.startsWith("/seller") && (
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

          {session && (
            <div className="relative">
              <button
                type="button"
                aria-expanded={notificationsOpen}
                onClick={() => {
                  const open = !notificationsOpen;
                  setNotificationsOpen(open);
                  if (open) void loadNotifications();
                }}
                className="relative border border-stone-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-stone-100"
              >
                Thông báo
                {notifications.length > 0 && (
                  <span className="ml-2 inline-flex min-w-5 justify-center bg-rose-600 px-1.5 text-xs font-semibold text-white">
                    {notifications.length}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-[min(90vw,22rem)] border border-stone-200 bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
                    <p className="font-semibold">Thông báo</p>
                    <button type="button" onClick={() => void loadNotifications()} className="text-xs text-teal-800 hover:underline">Làm mới</button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="px-4 py-5 text-sm text-slate-500">Không có thông báo cần xử lý.</p>
                  ) : (
                    <ul className="max-h-96 overflow-y-auto divide-y divide-stone-100">
                      {notifications.map((item) => (
                        <li key={item.id}>
                          <Link href={item.href} onClick={() => setNotificationsOpen(false)} className="block px-4 py-3 hover:bg-stone-50">
                            <span className="block text-sm font-medium text-slate-900">{item.title}</span>
                            <span className="mt-1 block text-xs text-slate-500">{item.detail}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
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
