"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { OrderTimeline } from "../../components/buyer/MyOrders";
import { AdminNotAllowed, Badge, Card, Empty, RequireLogin } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { useLoadEffect } from "../../lib/hooks";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "../../lib/order";
import { paymentMethodLabel } from "../../lib/payment";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";
import type { Order } from "../../lib/types";

/** Chi tiết một đơn hàng của người mua. */
export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = Number(params.orderId);
  const { token, isAdmin } = useSession();
  const notify = useNotify();
  const [order, setOrder] = useState<Order | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const orders = await api<Order[]>("/api/orders/mine", { token });
      const found = orders.find((item) => item.id === orderId) ?? null;
      setOrder(found);
      setState(found ? "ready" : "missing");
    } catch (error) {
      notify(errorMessage(error, "Không thể tải đơn hàng."), "error");
      setState("missing");
    }
  }, [token, orderId, notify]);

  useLoadEffect(load);

  if (!token) {
    return <RequireLogin next={`/orders/${orderId}`} message="Đăng nhập để xem chi tiết đơn hàng." />;
  }
  if (isAdmin) {
    return <AdminNotAllowed feature="chức năng đặt hàng" />;
  }
  if (state === "loading") {
    return <Card>Đang tải đơn hàng...</Card>;
  }
  if (!order) {
    return (
      <Card>
        <Empty>Không tìm thấy đơn hàng này trong tài khoản của bạn.</Empty>
        <Link href="/orders" className="text-sm text-teal-800 hover:underline">
          ← Về danh sách đơn hàng
        </Link>
      </Card>
    );
  }

  const itemsTotal = order.items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);

  return (
    <div className="space-y-5">
      <Link href="/orders" className="text-sm text-teal-800 hover:underline">
        ← Danh sách đơn hàng
      </Link>
      <Card
        title={`Đơn #${order.id}`}
        action={
          <div className="flex gap-2">
            <Badge tone={order.status === "CANCELLED" ? "danger" : order.status === "DELIVERED" ? "success" : "info"}>
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>
            <Badge tone={order.paymentStatus === "PAID" ? "success" : order.paymentStatus === "REFUNDED" ? "info" : "warning"}>
              {PAYMENT_STATUS_LABELS[order.paymentStatus]}
            </Badge>
          </div>
        }
      >
        <p className="text-xs text-slate-500">Đặt lúc {formatDateTime(order.createdAt)}</p>
        <OrderTimeline order={order} />
      </Card>

      <Card title="Sản phẩm">
        <ul className="divide-y divide-stone-100 text-sm">
          {order.items.map((item) => (
            <li key={item.productId} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <Link href={`/products/${item.productId}`} className="hover:text-teal-800">
                {item.productName} × {item.quantity}
              </Link>
              <span>
                {formatCurrency(item.unitPrice)} × {item.quantity} = <b>{formatCurrency(item.unitPrice * item.quantity)}</b>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-stone-200 pt-3 text-sm">
          <p className="flex justify-between">
            <span className="text-slate-600">Tạm tính</span>
            <span>{formatCurrency(itemsTotal)}</span>
          </p>
          {order.discountAmount > 0 && (
            <p className="flex justify-between text-teal-800">
              <span>Mã giảm giá {order.voucherCode}</span>
              <span>-{formatCurrency(order.discountAmount)}</span>
            </p>
          )}
          <p className="flex justify-between text-base font-semibold">
            <span>Tổng thanh toán</span>
            <span>{formatCurrency(order.totalAmount)}</span>
          </p>
        </div>
      </Card>

      <Card title="Giao hàng và thanh toán">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Địa chỉ nhận hàng</dt>
            <dd>{order.shippingAddress}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Phương thức thanh toán</dt>
            <dd>{paymentMethodLabel(order.paymentMethod)}</dd>
          </div>
          {order.trackingCode && (
            <>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Đơn vị vận chuyển</dt>
                <dd>{order.carrier}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Mã vận đơn</dt>
                <dd>{order.trackingCode}</dd>
              </div>
            </>
          )}
          {order.estimatedDeliveryAt && order.status === "SHIPPING" && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Dự kiến giao</dt>
              <dd>{formatDateTime(order.estimatedDeliveryAt)}</dd>
            </div>
          )}
        </dl>
      </Card>
    </div>
  );
}
