"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { useLoadEffect } from "../../lib/hooks";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";
import type { Order, OrderItem } from "../../lib/types";
import { Stars } from "../Stars";
import { Badge, Button, Card, Empty, Field, Modal, TextArea } from "../ui";

const statusLabels: Record<string, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PACKING: "Đang đóng gói",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã nhận hàng",
  CANCELLED: "Đã huỷ",
};

const paymentLabels: Record<string, string> = {
  PENDING: "Chưa thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "Thanh toán lỗi",
  REFUNDED: "Đã hoàn tiền",
};

export function MyOrders() {
  const { token } = useSession();
  const notify = useNotify();
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviewing, setReviewing] = useState<{
    order: Order;
    item: OrderItem;
  } | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setOrders(await api<Order[]>("/api/orders/mine", { token }));
    } catch (error) {
      notify(errorMessage(error, "Không thể tải đơn hàng."), "error");
    }
  }, [token, notify]);

  useLoadEffect(load);

  const act = async (path: string, message: string) => {
    try {
      await api<Order>(path, { method: "PUT", token });
      notify(message, "success");
      await load();
    } catch (error) {
      notify(errorMessage(error, "Không thực hiện được yêu cầu."), "error");
    }
  };

  return (
    <Card
      title="Đơn hàng của tôi"
      action={
        <Button variant="ghost" onClick={load}>
          Làm mới
        </Button>
      }
    >
      {orders.length === 0 ? (
        <Empty>Bạn chưa có đơn hàng nào.</Empty>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="border border-stone-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">Đơn #{order.id}</p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    tone={
                      order.status === "CANCELLED"
                        ? "danger"
                        : order.status === "DELIVERED"
                          ? "success"
                          : "info"
                    }
                  >
                    {statusLabels[order.status] ?? order.status}
                  </Badge>
                  <Badge
                    tone={
                      order.paymentStatus === "PAID" ? "success" : "warning"
                    }
                  >
                    {paymentLabels[order.paymentStatus] ?? order.paymentStatus}
                  </Badge>
                </div>
              </div>

              <ul className="mt-3 space-y-2 text-sm">
                {order.items.map((item) => (
                  <li
                    key={item.productId}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <Link href={`/products/${item.productId}`} className="hover:text-teal-800">
                      {item.productName} × {item.quantity}
                    </Link>
                    <span className="flex items-center gap-3">
                      <span className="text-slate-600">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </span>
                      {order.status === "DELIVERED" &&
                        (item.reviewed ? (
                          <Badge tone="success">Đã đánh giá</Badge>
                        ) : (
                          <Button
                            variant="secondary"
                            className="px-2 py-1"
                            onClick={() => setReviewing({ order, item })}
                          >
                            Đánh giá
                          </Button>
                        ))}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-3 text-xs text-slate-500">
                Giao tới: {order.shippingAddress}
              </p>
              {order.voucherCode && (
                <p className="text-xs text-teal-800">
                  Mã {order.voucherCode} · giảm{" "}
                  {formatCurrency(order.discountAmount)}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  Tổng: {formatCurrency(order.totalAmount)}
                </p>
                <div className="flex gap-2">
                  {order.paymentStatus === "PENDING" &&
                    order.status !== "CANCELLED" && (
                      <Button
                        onClick={() =>
                          act(
                            `/api/orders/${order.id}/pay`,
                            "Đã ghi nhận thanh toán.",
                          )
                        }
                      >
                        Thanh toán
                      </Button>
                    )}
                  {["PENDING", "CONFIRMED", "PACKING"].includes(
                    order.status,
                  ) && (
                    <Button
                      variant="danger"
                      onClick={() =>
                        act(
                          `/api/orders/${order.id}/cancel`,
                          "Đã huỷ đơn hàng.",
                        )
                      }
                    >
                      Huỷ đơn
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {reviewing && (
        <ReviewModal
          token={token}
          order={reviewing.order}
          item={reviewing.item}
          onClose={() => setReviewing(null)}
          onDone={async () => {
            setReviewing(null);
            await load();
          }}
        />
      )}
    </Card>
  );
}

function ReviewModal({
  token,
  order,
  item,
  onClose,
  onDone,
}: {
  token: string | null;
  order: Order;
  item: OrderItem;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const notify = useNotify();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const submit = async () => {
    try {
      await api(`/api/orders/${order.id}/reviews`, {
        method: "POST",
        token,
        body: { productId: item.productId, rating, comment },
      });
      notify("Cảm ơn bạn đã đánh giá.", "success");
      await onDone();
    } catch (error) {
      notify(errorMessage(error, "Không thể gửi đánh giá."), "error");
    }
  };

  return (
    <Modal title={`Đánh giá: ${item.productName}`} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Số sao">
          <Stars rating={rating} onSelect={setRating} />
        </Field>
        <Field label="Nhận xét">
          <TextArea
            value={comment}
            onChange={setComment}
            placeholder="Sản phẩm dùng tốt..."
          />
        </Field>
        <Button onClick={submit}>Gửi đánh giá</Button>
      </div>
    </Modal>
  );
}
