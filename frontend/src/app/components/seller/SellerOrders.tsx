"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useLoadEffect } from "../../lib/hooks";
import { formatCurrency, formatDateTime } from "../../lib/format";
import type { Notify } from "../../lib/session";
import type { Order, OrderStatus } from "../../lib/types";
import { Badge, Button, Card, Empty } from "../ui";

/** Bước xử lý tiếp theo mà người bán được phép chuyển. */
const nextStatuses: Partial<
  Record<OrderStatus, { status: OrderStatus; label: string }[]>
> = {
  PENDING: [
    { status: "CONFIRMED", label: "Xác nhận đơn" },
    { status: "CANCELLED", label: "Huỷ đơn" },
  ],
  CONFIRMED: [
    { status: "PACKING", label: "Đóng gói" },
    { status: "CANCELLED", label: "Huỷ đơn" },
  ],
  PACKING: [{ status: "SHIPPING", label: "Giao cho vận chuyển" }],
  SHIPPING: [{ status: "DELIVERED", label: "Đã giao xong" }],
};

export function SellerOrders({
  token,
  notify,
}: {
  token: string | null;
  notify: Notify;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setOrders(await api<Order[]>("/api/orders/seller", { token }));
      setError("");
    } catch (caught) {
      setError(errorMessage(caught, "Không thể tải đơn hàng của shop."));
    }
  }, [token]);

  useLoadEffect(load);

  const changeStatus = async (order: Order, status: OrderStatus) => {
    try {
      await api(`/api/orders/${order.id}/status?status=${status}`, {
        method: "PUT",
        token,
      });
      notify(`Đơn #${order.id} chuyển sang ${status}.`, "success");
      await load();
    } catch (caught) {
      notify(errorMessage(caught, "Không thể cập nhật đơn hàng."), "error");
    }
  };

  return (
    <Card
      title="Đơn hàng của shop"
      action={
        <Button variant="ghost" onClick={load}>
          Làm mới
        </Button>
      }
    >
      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
      {orders.length === 0 ? (
        <Empty>Chưa có đơn hàng nào.</Empty>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="border border-stone-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">Đơn #{order.id}</p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge
                    tone={order.status === "CANCELLED" ? "danger" : "info"}
                  >
                    {order.status}
                  </Badge>
                  <Badge
                    tone={
                      order.paymentStatus === "PAID" ? "success" : "warning"
                    }
                  >
                    {order.paymentStatus}
                  </Badge>
                </div>
              </div>
              <ul className="mt-2 text-sm text-slate-600">
                {order.items.map((item) => (
                  <li key={item.productId}>
                    {item.productName} × {item.quantity} —{" "}
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-500">
                Giao tới: {order.shippingAddress}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  Tổng: {formatCurrency(order.totalAmount)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(nextStatuses[order.status] ?? []).map((action) => (
                    <Button
                      key={action.status}
                      variant={
                        action.status === "CANCELLED" ? "danger" : "primary"
                      }
                      onClick={() => changeStatus(order, action.status)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
