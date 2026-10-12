"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useLoadEffect } from "../../lib/hooks";
import {
  ALLOWED_NEXT_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  cancelBlockedReason,
} from "../../lib/order";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";
import { formatCurrency, formatDateTime } from "../../lib/format";
import type { Order, OrderStatus } from "../../lib/types";
import { Badge, Button, Card, Empty, Select, StatTile } from "../ui";
import { BarChart } from "../Charts";
import { dayKey } from "../../lib/csv";

export function SellerOrders() {
  const { token } = useSession();
  const notify = useNotify();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [chartRange, setChartRange] = useState("7d");

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
  const productSales = Object.values(
    completedOrders.reduce<Record<string, { name: string; quantity: number }>>((acc, order) => {
      for (const item of order.items) {
        const key = item.productId.toString();
        const current = acc[key] ?? { name: item.productName, quantity: 0 };
        current.quantity += item.quantity;
        acc[key] = current;
      }
      return acc;
    }, {}),
  ).sort((left, right) => right.quantity - left.quantity);
  const filteredOrders = statusFilter
    ? orders.filter((order) => order.status === statusFilter)
    : orders;

  // Doanh thu thực nhận (sau phí) theo ngày hoặc theo tháng của các đơn đã giao.
  const chartData = (() => {
    const buckets: { key: string; label: string; value: number }[] = [];
    if (chartRange === "7d") {
      for (let offset = 6; offset >= 0; offset--) {
        const day = new Date(now);
        day.setDate(day.getDate() - offset);
        buckets.push({ key: dayKey(day), label: dayKey(day).slice(5), value: 0 });
      }
    } else {
      for (let offset = 5; offset >= 0; offset--) {
        const month = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        const key = dayKey(month).slice(0, 7);
        buckets.push({ key, label: `${key.slice(5)}/${key.slice(2, 4)}`, value: 0 });
      }
    }
    for (const order of completedOrders) {
      const key = chartRange === "7d" ? dayKey(order.createdAt) : dayKey(order.createdAt).slice(0, 7);
      const bucket = buckets.find((item) => item.key === key);
      if (bucket) bucket.value += order.sellerAmount;
    }
    return buckets;
  })();

  const changeStatus = async (order: Order, status: OrderStatus) => {
    try {
      await api(`/api/orders/${order.id}/status?status=${status}`, {
        method: "PUT",
        token,
      });
      notify(`Đơn #${order.id} chuyển sang ${ORDER_STATUS_LABELS[status]}.`, "success");
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
        <StatTile label="Doanh thu tháng (sau phí)" value={formatCurrency(monthlyOrders.reduce((total, order) => total + order.sellerAmount, 0))} />
        <StatTile label="Doanh thu năm (sau phí)" value={formatCurrency(yearlyOrders.reduce((total, order) => total + order.sellerAmount, 0))} />
      </div>
      <Card
        title="Doanh thu thực nhận"
        action={
          <div className="w-40">
            <Select
              value={chartRange}
              onChange={setChartRange}
              options={[
                { value: "7d", label: "7 ngày qua" },
                { value: "6m", label: "6 tháng qua" },
              ]}
            />
          </div>
        }
      >
        <BarChart data={chartData} format={formatCurrency} barClass="bg-emerald-500" />
      </Card>
      <Card title="Sản phẩm đã bán" className="border-t-4 border-t-emerald-500">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {productSales.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có sản phẩm nào được giao thành công.</p>
          ) : (
            productSales.slice(0, 6).map((item) => (
              <div key={item.name} className="rounded border border-stone-200 bg-stone-50 p-3">
                <p className="font-medium text-slate-900">{item.name}</p>
                <p className="mt-1 text-sm text-slate-600">Đã bán: <span className="font-semibold text-emerald-700">{item.quantity}</span></p>
              </div>
            ))
          )}
        </div>
      </Card>
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
                    {PAYMENT_STATUS_LABELS[order.paymentStatus]}
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
                <div>
                  <p className="font-semibold">
                    Tổng: {formatCurrency(order.totalAmount)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Phí nền tảng {order.commissionPercent}%: -{formatCurrency(order.commissionAmount)} · Thực nhận:{" "}
                    <b className="text-emerald-700">{formatCurrency(order.sellerAmount)}</b>
                  </p>
                </div>
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
