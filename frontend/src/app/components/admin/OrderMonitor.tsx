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
import { Badge, Button, Card, Empty, Select, TextInput } from "../ui";
import { Pager, usePaging } from "../Pager";
import { recordAudit } from "../../lib/audit";

const statuses: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PACKING",
  "SHIPPING",
  "DELIVERED",
  "CANCELLED",
];

/** Theo dõi toàn bộ đơn hàng của nền tảng và can thiệp khi cần. */
export function OrderMonitor() {
  const { token } = useSession();
  const notify = useNotify();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("");
  const [keyword, setKeyword] = useState("");

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
      notify(`Đơn #${order.id} → ${ORDER_STATUS_LABELS[status as OrderStatus]}.`, "success");
      recordAudit(token, "Đổi trạng thái đơn hàng", `Đơn #${order.id} → ${ORDER_STATUS_LABELS[status as OrderStatus]}`);
      await load();
    } catch (error) {
      notify(errorMessage(error, "Không thể cập nhật đơn hàng."), "error");
    }
  };

  const needle = keyword.trim().toLowerCase();
  const filtered = orders
    .filter((order) => !filter || order.status === filter)
    .filter(
      (order) =>
        !needle ||
        String(order.id) === needle.replace("#", "") ||
        String(order.buyerId) === needle ||
        String(order.trackingCode ?? "").toLowerCase().includes(needle) ||
        order.items.some((item) => item.productName.toLowerCase().includes(needle)),
    );
  const paging = usePaging(filtered, 10, `${filter}|${needle}`);

  return (
    <Card
      title={`Đơn hàng toàn sàn (${orders.length})`}
      action={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={load}>
            Làm mới
          </Button>
          <div className="w-48">
            <TextInput value={keyword} onChange={setKeyword} placeholder="Mã đơn, mã vận đơn, sản phẩm" />
          </div>
          <div className="w-48">
            <Select
              value={filter}
              onChange={setFilter}
              options={[
                { value: "", label: "Tất cả trạng thái" },
                ...statuses.map((status) => ({
                  value: status,
                  label: ORDER_STATUS_LABELS[status],
                })),
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
          {paging.slice.map((order) => (
            <div key={order.id} className="border border-stone-200 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  Đơn #{order.id} · người mua #{order.buyerId}
                </p>
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
                {/* Chỉ liệt kê bước chuyển hợp lệ: từ SHIPPING trở đi không còn tuỳ chọn huỷ. */}
                {ALLOWED_NEXT_STATUSES[order.status].length > 0 ? (
                  <div className="w-56">
                    <Select
                      value=""
                      onChange={(value) => value && changeStatus(order, value)}
                      options={[
                        { value: "", label: "Chuyển trạng thái..." },
                        ...ALLOWED_NEXT_STATUSES[order.status].map(
                          (action) => ({
                            value: action.status,
                            label: action.label,
                          }),
                        ),
                      ]}
                    />
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">
                    {cancelBlockedReason(order.status) ??
                      "Đơn đã kết thúc, không còn bước xử lý."}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Pager page={paging.page} pageCount={paging.pageCount} total={paging.total} onPage={paging.setPage} />
    </Card>
  );
}
