"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useLoadEffect } from "../../lib/hooks";
import { formatCurrency, formatDateTime } from "../../lib/format";
import type { Notify } from "../../lib/session";
import type { Order, OrderStatus } from "../../lib/types";
import { Badge, Button, Card, Empty, Select } from "../ui";

const statuses: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PACKING",
  "SHIPPING",
  "DELIVERED",
  "CANCELLED",
];

/** Theo dõi toàn bộ đơn hàng của nền tảng và can thiệp khi cần. */
export function OrderMonitor({
  token,
  notify,
}: {
  token: string | null;
  notify: Notify;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setOrders(await api<Order[]>("/api/orders/admin", { token }));
    } catch (error) {
      notify(errorMessage(error, "Không thể tải đơn hàng."), "error");
    }
  }, [token, notify]);

  useLoadEffect(load);

  const changeStatus = async (order: Order, status: string) => {
    try {
      await api(`/api/orders/${order.id}/status?status=${status}`, {
        method: "PUT",
        token,
      });
      notify(`Đơn #${order.id} → ${status}.`, "success");
      await load();
    } catch (error) {
      notify(errorMessage(error, "Không thể cập nhật đơn hàng."), "error");
    }
  };

  const filtered = filter
    ? orders.filter((order) => order.status === filter)
    : orders;

  return (
    <Card
      title={`Đơn hàng toàn sàn (${orders.length})`}
      action={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={load}>
            Làm mới
          </Button>
          <div className="w-48">
            <Select
              value={filter}
              onChange={setFilter}
              options={[
                { value: "", label: "Tất cả trạng thái" },
                ...statuses.map((status) => ({ value: status, label: status })),
              ]}
            />
          </div>
        </div>
      }
    >
      {filtered.length === 0 ? (
        <Empty>Không có đơn hàng nào.</Empty>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div key={order.id} className="border border-stone-200 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  Đơn #{order.id} · người mua #{order.buyerId}
                </p>
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
              <p className="mt-1 text-xs text-slate-500">
                {formatDateTime(order.createdAt)}
              </p>
              <p className="mt-2 text-slate-600">
                {order.items
                  .map((item) => `${item.productName} ×${item.quantity}`)
                  .join(", ")}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {formatCurrency(order.totalAmount)}
                </p>
                <div className="w-52">
                  <Select
                    value=""
                    onChange={(value) => value && changeStatus(order, value)}
                    options={[
                      { value: "", label: "Chuyển trạng thái..." },
                      ...statuses.map((status) => ({
                        value: status,
                        label: status,
                      })),
                    ]}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
