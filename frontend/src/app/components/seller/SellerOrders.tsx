"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useLoadEffect } from "../../lib/hooks";
import {
  ALLOWED_NEXT_STATUSES,
  ORDER_STATUS_LABELS,
  cancelBlockedReason,
} from "../../lib/order";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";
import { formatCurrency, formatDateTime } from "../../lib/format";
import type { Order, OrderStatus } from "../../lib/types";
import { Badge, Button, Card, Empty, Select, StatTile } from "../ui";

export function SellerOrders() {
  const { token } = useSession();
  const notify = useNotify();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

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

  const now = new Date();
  const completedOrders = orders.filter(
    (order) => order.status === "DELIVERED" && order.paymentStatus === "PAID",
  );
  const monthlyOrders = completedOrders.filter((order) => {
    const date = new Date(order.createdAt);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  const yearlyOrders = completedOrders.filter(
    (order) => new Date(order.createdAt).getFullYear() === now.getFullYear(),
  );
  const unitsSold = completedOrders.reduce(
    (total, order) => total + order.items.reduce((quantity, item) => quantity + item.quantity, 0),
    0,
  );
  const filteredOrders = statusFilter
    ? orders.filter((order) => order.status === statusFilter)
    : orders;

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
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Chờ xác nhận" value={orders.filter((order) => order.status === "PENDING").length} />
        <StatTile label="Cần giao vận chuyển" value={orders.filter((order) => order.status === "PACKING").length} />
        <StatTile label="Đã bán · sản phẩm" value={unitsSold} />
        <StatTile label="Doanh thu tháng" value={formatCurrency(monthlyOrders.reduce((total, order) => total + order.totalAmount, 0))} />
        <StatTile label="Doanh thu năm" value={formatCurrency(yearlyOrders.reduce((total, order) => total + order.totalAmount, 0))} />
      </div>
      <Card
        title="Quản lý đơn hàng"
        action={
          <Button variant="ghost" onClick={load}>
            Làm mới
          </Button>
        }
      >
        <div className="mb-4 max-w-xs">
          <Select value={statusFilter} onChange={setStatusFilter} options={[
            { value: "", label: "Tất cả trạng thái" },
            ...Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label })),
          ]} />
        </div>
        {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
        {filteredOrders.length === 0 ? (
          <Empty>Không có đơn hàng phù hợp.</Empty>
        ) : (
          <div className="space-y-3">
          {filteredOrders.map((order) => (
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
                    {ORDER_STATUS_LABELS[order.status]}
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
                <div className="flex flex-wrap items-center gap-2">
                  {cancelBlockedReason(order.status) && (
                    <span className="text-xs text-slate-500">
                      {cancelBlockedReason(order.status)}
                    </span>
                  )}
                  {ALLOWED_NEXT_STATUSES[order.status].map((action) => (
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
    </div>
  );
}
