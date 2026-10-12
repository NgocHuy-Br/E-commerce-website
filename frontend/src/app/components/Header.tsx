"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useCart } from "../lib/cart";
import { useSession } from "../lib/session";
import { useNotify } from "../lib/toast";
import { ORDER_STATUS_LABELS } from "../lib/order";
import { rolesSummary } from "../lib/labels";
import type { AuthResponse, Order, Store, WalletTransaction } from "../lib/types";
import { useReadNotifications } from "../lib/notificationsRead";

type NotificationItem = { id: string; title: string; detail: string; href: string };

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M3 4h2l2.2 9.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 7H7" />
      <circle cx="10" cy="18.5" r="1.2" />
      <circle cx="17" cy="18.5" r="1.2" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M15 17h5l-1.3-1.3A2.8 2.8 0 0 1 18 14.9V10a6 6 0 1 0-12 0v4.9a2.8 2.8 0 0 1-.7 1.8L4 17h5" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

const customerNavItems = [
  { href: "/orders", label: "Đơn hàng của tôi" },
  { href: "/wishlist", label: "Yêu thích" },
  { href: "/account/wallet", label: "Ví của tôi" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, signOut, signIn, isAdmin } = useSession();
  const { token, hasRole } = useSession();
  const { readIds, markRead } = useReadNotifications();
  const { count } = useCart();
  const notify = useNotify();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const unreadNotifications = notifications.filter((item) => !readIds.has(item.id));
  const visibleNotificationCount = Math.min(unreadNotifications.length, 9);

  const loadNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      return;
    }
    const [buyerOrders, sellerOrders, pendingStores, adminOrders, myStore, pendingWithdrawals] = await Promise.all([
      hasRole("BUYER") ? api<Order[]>("/api/orders/mine", { token }).catch(() => []) : Promise.resolve([]),
      hasRole("SELLER") ? api<Order[]>("/api/orders/seller", { token }).catch(() => []) : Promise.resolve([]),
      isAdmin ? api<Store[]>("/api/stores/admin?status=PENDING", { token }).catch(() => []) : Promise.resolve([]),
      isAdmin ? api<Order[]>("/api/orders/admin", { token }).catch(() => []) : Promise.resolve([]),
      !isAdmin ? api<Store>("/api/stores/mine", { token }).catch(() => null) : Promise.resolve(null),
      isAdmin
        ? api<WalletTransaction[]>("/api/orders/admin/withdrawals?status=PENDING", { token }).catch(() => [])
        : Promise.resolve([]),
    ]);
    const next: NotificationItem[] = [];

    if (myStore && myStore.status !== "PENDING") {
      const reason = myStore.statusReason ? ` Lý do: ${myStore.statusReason}` : "";
      const text: Record<string, [string, string]> = {
        ACTIVE: ["Cửa hàng đã được duyệt", "Bạn có thể đăng bán sản phẩm."],
        REJECTED: ["Yêu cầu mở cửa hàng bị từ chối", `Hãy cập nhật thông tin và gửi lại.${reason}`],
        SUSPENDED: ["Cửa hàng bị tạm ngưng", `Liên hệ quản trị viên để được mở lại.${reason}`],
      };
      const entry = text[myStore.status];
      if (entry) {
        next.push({ id: `mystore-${myStore.id}-${myStore.status}`, title: entry[0], detail: entry[1], href: "/seller" });
      }
    }
    if (pendingWithdrawals.length > 0) {
      next.push({
        id: `admin-withdrawals-${pendingWithdrawals.length}`,
        title: `${pendingWithdrawals.length} yêu cầu rút tiền chờ duyệt`,
        detail: "Mở mục Rút tiền để xử lý.",
        href: "/admin",
      });
    }

    for (const order of buyerOrders) {
      if (order.paymentStatus === "PENDING" && order.status !== "CANCELLED") {
        next.push({ id: `pay-${order.id}`, title: `Đơn #${order.id} cần thanh toán`, detail: "Hoàn tất thanh toán để tiếp tục đơn hàng.", href: "/orders" });
      } else if (["PENDING", "CONFIRMED", "PACKING", "SHIPPING"].includes(order.status)) {
        next.push({ id: `track-${order.id}-${order.status}`, title: `Đơn #${order.id}: ${ORDER_STATUS_LABELS[order.status]}`, detail: "Trạng thái đơn mua của bạn vừa được cập nhật.", href: "/orders" });
      } else if (order.status === "DELIVERED" && order.items.some((item) => !item.reviewed)) {
        next.push({ id: `review-${order.id}`, title: `Đơn #${order.id} đã giao`, detail: "Bạn có thể đánh giá sản phẩm đã mua.", href: "/orders" });
      }
    }

    for (const order of sellerOrders) {
      if (order.status === "PENDING") {
        next.push({ id: `seller-${order.id}-${order.status}`, title: `Đơn #${order.id} cần xác nhận`, detail: "Kiểm tra và xác nhận đơn hàng mới.", href: "/seller" });
      } else if (order.status === "CONFIRMED" || order.status === "PACKING") {
        next.push({ id: `seller-${order.id}-${order.status}`, title: `Đơn #${order.id} cần xử lý`, detail: `Đơn đang ở trạng thái ${ORDER_STATUS_LABELS[order.status].toLowerCase()}.`, href: "/seller" });
      }
    }

    for (const store of pendingStores.slice(0, 3)) {
      next.push({ id: `store-${store.id}`, title: `Cửa hàng chờ duyệt: ${store.name}`, detail: "Có yêu cầu mở cửa hàng cần xem xét.", href: "/admin" });
    }
    const pendingOrderCount = adminOrders.filter((order) => order.status === "PENDING").length;
    if (pendingOrderCount > 0) {
      next.push({ id: `admin-orders-${pendingOrderCount}`, title: `${pendingOrderCount} đơn hàng chờ xử lý`, detail: "Xem danh sách đơn hàng toàn sàn.", href: "/admin" });
    }

    setNotifications(next.slice(0, 10));
  }, [hasRole, isAdmin, token]);

  // Làm mới quyền mỗi lần mở trang để đổi quyền (ví dụ vừa được duyệt shop) có hiệu lực ngay.
  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;
    void api<AuthResponse>("/api/auth/refresh", { method: "POST", token })
      .then((fresh) => {
        if (cancelled) return;
        const same = [...fresh.roles].sort().join() === [...(session?.roles ?? [])].sort().join();
        if (!same) signIn(fresh);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // Chỉ chạy lại khi đăng nhập mới; so sánh quyền dùng giá trị tại thời điểm gọi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!session || !token) {
      return;
    }
    const timer = window.setTimeout(() => {
      void loadNotifications();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [session, token, loadNotifications]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(target)) {
        setAccountOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Quản trị viên chỉ thấy khu quản trị; khách thấy đơn hàng và kênh người bán.
  const items = [
    { href: "/", label: "Trang chủ" },
    ...(session && !isAdmin ? customerNavItems : []),
    ...(session && !isAdmin
      ? [{ href: "/seller", label: hasRole("SELLER") ? "Kênh người bán" : "Đăng ký bán hàng" }]
      : []),
    ...(isAdmin ? [{ href: "/admin", label: "Quản trị" }] : []),
  ];
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
        <Link href="/" className="mr-2 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-lg font-bold text-white shadow-sm">
            P
          </div>
          <div>
            <span className="block text-lg font-bold tracking-tight text-slate-900">
              PTIT Shopee
            </span>
            <span className="hidden text-[11px] text-slate-500 sm:block">
              Nền tảng mua sắm trực tuyến
            </span>
          </div>
        </Link>

        <nav className="order-last flex w-full flex-wrap items-center gap-1 lg:order-none lg:w-auto lg:flex-1">
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

        <div className="ml-auto flex items-center gap-2">
          {!isAdmin && (
            <Link
              href="/cart"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 text-slate-700 transition hover:bg-stone-100 hover:text-teal-800"
              aria-label="Giỏ hàng"
            >
              <CartIcon />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex min-w-5 justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </Link>
          )}

          {session && (
            <div ref={notificationsRef} className="relative">
              <button
                type="button"
                aria-expanded={notificationsOpen}
                onClick={() => {
                  const open = !notificationsOpen;
                  setNotificationsOpen(open);
                  if (open) void loadNotifications();
                }}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 text-slate-700 transition hover:bg-stone-100 hover:text-teal-800"
                aria-label="Thông báo"
              >
                <BellIcon />
                {visibleNotificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-5 justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white">
                    {visibleNotificationCount}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-[min(90vw,22rem)] border border-stone-200 bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
                    <p className="font-semibold">Thông báo</p>
                    <span className="flex items-center gap-3">
                      {unreadNotifications.length > 0 && (
                        <button
                          type="button"
                          onClick={() => markRead(notifications.map((item) => item.id))}
                          className="text-xs text-teal-800 hover:underline"
                        >
                          Đánh dấu đã đọc
                        </button>
                      )}
                      <button type="button" onClick={() => void loadNotifications()} className="text-xs text-teal-800 hover:underline">Làm mới</button>
                    </span>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="px-4 py-5 text-sm text-slate-500">Không có thông báo cần xử lý.</p>
                  ) : (
                    <ul className="max-h-96 overflow-y-auto divide-y divide-stone-100">
                      {notifications.map((item) => {
                        const unread = !readIds.has(item.id);
                        return (
                          <li key={item.id}>
                            <Link
                              href={item.href}
                              onClick={() => {
                                markRead([item.id]);
                                setNotificationsOpen(false);
                              }}
                              className={`block px-4 py-3 hover:bg-stone-50 ${unread ? "bg-teal-50/40" : ""}`}
                            >
                              <span className={`block text-sm text-slate-900 ${unread ? "font-semibold" : "font-normal text-slate-600"}`}>
                                {unread && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-rose-500" />}
                                {item.title}
                              </span>
                              <span className="mt-1 block text-xs text-slate-500">{item.detail}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {session ? (
            <div ref={accountRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((value) => !value)}
                className="flex items-center gap-2 rounded-full border border-stone-300 bg-white px-2 py-1.5 text-sm text-slate-700 shadow-sm transition hover:border-teal-700 hover:text-teal-800"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-emerald-500 text-xs font-bold text-white">
                  {session.email.charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:inline">Chào, {session.email.split("@")[0]}</span>
                <ChevronDownIcon />
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-md border border-stone-200 bg-white shadow-lg">
                  <div className="border-b border-stone-100 px-4 py-3">
                    <p className="text-sm font-semibold">{session.email}</p>
                    <p className="text-xs text-slate-500">{rolesSummary(session.roles)}</p>
                  </div>
                  <div className="py-2">
                    <Link href="/account/profile" onClick={() => setAccountOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-stone-100">
                      Thông tin cá nhân
                    </Link>
                    <Link href="/account/security" onClick={() => setAccountOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-stone-100">
                      Mật khẩu & bảo mật
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        signOut();
                        notify("Đã đăng xuất.", "info");
                        router.push("/");
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-stone-100"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href={loginHref}
                className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-700 hover:text-teal-800"
              >
                Đăng ký
              </Link>
              <Link
                href={loginHref}
                className="rounded-full bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800"
              >
                Đăng nhập
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
