"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { useLoadEffect } from "../../lib/hooks";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  cancelBlockedReason,
  canCancel,
} from "../../lib/order";
import {
  PAYMENT_METHODS,
  REFUND_NOTICE,
  paymentMethodLabel,
} from "../../lib/payment";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";
import type { Order, OrderItem, OrderStatus, PaymentMethod } from "../../lib/types";
import { Stars } from "../Stars";
import { Pager, usePaging } from "../Pager";
import { Badge, Button, Card, Empty, Field, Modal, TextArea } from "../ui";

const statusLabels = ORDER_STATUS_LABELS;
const paymentLabels = PAYMENT_STATUS_LABELS;

export function MyOrders() {
  const { token } = useSession();
  const notify = useNotify();
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviewing, setReviewing] = useState<{
    order: Order;
    item: OrderItem;
  } | null>(null);
  const [paying, setPaying] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState<Order | null>(null);
  const [tab, setTab] = useState("ALL");

  const tabMatchers: Record<string, (order: Order) => boolean> = {
    ALL: () => true,
    UNPAID: (order) => order.paymentStatus === "PENDING" && order.status !== "CANCELLED",
    PROCESSING: (order) => ["PENDING", "CONFIRMED", "PACKING"].includes(order.status),
    SHIPPING: (order) => order.status === "SHIPPING",
    DELIVERED: (order) => order.status === "DELIVERED",
    CANCELLED: (order) => order.status === "CANCELLED",
  };
  const tabLabels: [string, string][] = [
    ["ALL", "Tất cả"],
    ["UNPAID", "Chờ thanh toán"],
    ["PROCESSING", "Đang xử lý"],
    ["SHIPPING", "Đang giao"],
    ["DELIVERED", "Đã giao"],
    ["CANCELLED", "Đã huỷ"],
  ];
  const filteredOrders = orders.filter(tabMatchers[tab] ?? tabMatchers.ALL);
  const paging = usePaging(filteredOrders, 8, tab);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setOrders(await api<Order[]>("/api/orders/mine", { token }));
    } catch (error) {
      notify(errorMessage(error, "Không thể tải đơn hàng."), "error");
    }
  }, [token, notify]);

  useLoadEffect(load);

  const receive = async (order: Order) => {
    try {
      await api<Order>(`/api/orders/${order.id}/receive`, {
        method: "PUT",
        token,
      });
      notify(`Đã xác nhận nhận hàng đơn #${order.id}.`, "success");
      await load();
    } catch (error) {
      notify(errorMessage(error, "Không thể xác nhận nhận hàng."), "error");
    }
  };

  return (
    <Card
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
          <div className="flex gap-1 overflow-x-auto border-b border-stone-200 pb-2" role="tablist">
            {tabLabels.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${
                  tab === key
                    ? "border-teal-700 text-teal-800"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {label} ({orders.filter(tabMatchers[key]).length})
              </button>
            ))}
          </div>
          {filteredOrders.length === 0 && <Empty>Không có đơn hàng trong mục này.</Empty>}
          {paging.slice.map((order) => {
            const cancellable = canCancel(order.status);
            const blockedReason = cancelBlockedReason(order.status);
            const canPay =
              order.paymentStatus === "PENDING" && order.status !== "CANCELLED";
            return (
              <div key={order.id} className="border border-stone-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      <Link href={`/orders/${order.id}`} className="hover:text-teal-800 hover:underline">
                        Đơn #{order.id}
                      </Link>
                    </p>
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
                        order.paymentStatus === "PAID"
                          ? "success"
                          : order.paymentStatus === "REFUNDED"
                            ? "info"
                            : "warning"
                      }
                    >
                      {paymentLabels[order.paymentStatus] ??
                        order.paymentStatus}
                    </Badge>
                  </div>
                </div>

                <ul className="mt-3 space-y-2 text-sm">
                  {order.items.map((item) => (
                    <li
                      key={item.productId}
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <Link
                        href={`/products/${item.productId}`}
                        className="hover:text-teal-800"
                      >
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
                <OrderTimeline order={order} />
                <p className="text-xs text-slate-500">
                  Phương thức: {paymentMethodLabel(order.paymentMethod)}
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
                  <div className="flex flex-wrap items-center gap-2">
                    {order.status === "SHIPPING" && (
                      <Button onClick={() => receive(order)}>
                        Đã nhận hàng
                      </Button>
                    )}
                    {canPay && (
                      <Button onClick={() => setPaying(order)}>
                        Thanh toán
                      </Button>
                    )}
                    {cancellable ? (
                      <Button
                        variant="danger"
                        onClick={() => setCancelling(order)}
                      >
                        Huỷ đơn
                      </Button>
                    ) : (
                      blockedReason && (
                        <span className="text-xs text-slate-500">
                          {blockedReason}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <Pager page={paging.page} pageCount={paging.pageCount} total={paging.total} onPage={paging.setPage} />
        </div>
      )}

      {paying && (
        <PaymentModal
          order={paying}
          token={token}
          onClose={() => setPaying(null)}
          onDone={async () => {
            setPaying(null);
            await load();
          }}
        />
      )}

      {cancelling && (
        <CancelOrderModal
          order={cancelling}
          token={token}
          onClose={() => setCancelling(null)}
          onDone={async () => {
            setCancelling(null);
            await load();
          }}
        />
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

/** Dòng thời gian trạng thái và thông tin vận chuyển của đơn. */
export function OrderTimeline({ order }: { order: Order }) {
  if (order.status === "CANCELLED") {
    return <p className="mt-3 text-xs text-rose-600">Đơn hàng đã bị huỷ.</p>;
  }
  const steps: { key: OrderStatus; label: string; time?: string | null }[] = [
    { key: "PENDING", label: "Đặt hàng", time: order.createdAt },
    { key: "CONFIRMED", label: "Shop xác nhận" },
    { key: "PACKING", label: "Đóng gói" },
    { key: "SHIPPING", label: "Đang giao", time: order.shippedAt },
    { key: "DELIVERED", label: "Đã nhận hàng", time: order.deliveredAt },
  ];
  const current = steps.findIndex((step) => step.key === order.status);
  return (
    <div className="mt-3">
      <ol className="flex flex-wrap gap-x-4 gap-y-2">
        {steps.map((step, index) => {
          const done = index <= current;
          return (
            <li key={step.key} className="flex items-center gap-2 text-xs">
              <span
                className={`h-2.5 w-2.5 rounded-full ${done ? "bg-teal-600" : "bg-stone-300"}`}
              />
              <span className={done ? "font-medium text-slate-800" : "text-slate-400"}>
                {step.label}
                {done && step.time ? ` · ${formatDateTime(step.time)}` : ""}
              </span>
            </li>
          );
        })}
      </ol>
      {order.trackingCode && (
        <p className="mt-2 text-xs text-slate-600">
          Vận chuyển: <b>{order.carrier}</b> · Mã vận đơn: <b>{order.trackingCode}</b>
          {order.status === "SHIPPING" && order.estimatedDeliveryAt
            ? ` · Dự kiến giao: ${formatDateTime(order.estimatedDeliveryAt)}`
            : ""}
        </p>
      )}
    </div>
  );
}

/** Popup cho người mua chọn phương thức rồi thanh toán. */
function PaymentModal({
  order,
  token,
  onClose,
  onDone,
}: {
  order: Order;
  token: string | null;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const notify = useNotify();
  const [method, setMethod] = useState<PaymentMethod>(
    order.paymentMethod ?? "COD",
  );
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setSending(true);
    try {
      await api<Order>(`/api/orders/${order.id}/pay`, {
        method: "PUT",
        token,
        body: { paymentMethod: method },
      });
      notify(
        `Thanh toán đơn #${order.id} thành công qua ${
          PAYMENT_METHODS.find((item) => item.value === method)?.label ?? method
        }.`,
        "success",
      );
      await onDone();
    } catch (error) {
      notify(errorMessage(error, "Không thể thanh toán đơn hàng."), "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal title={`Thanh toán đơn #${order.id}`} onClose={onClose}>
      <p className="text-sm text-slate-600">
        Số tiền cần thanh toán:{" "}
        <b className="text-teal-800">{formatCurrency(order.totalAmount)}</b>
      </p>

      <fieldset className="mt-4 space-y-2">
        <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          Chọn phương thức thanh toán
        </legend>
        {PAYMENT_METHODS.map((item) => (
          <label
            key={item.value}
            className={`flex cursor-pointer items-start gap-3 border p-3 transition ${
              method === item.value
                ? "border-teal-700 bg-teal-50"
                : "border-stone-200 hover:bg-stone-50"
            }`}
          >
            <input
              type="radio"
              name="payment-method"
              value={item.value}
              checked={method === item.value}
              onChange={() => setMethod(item.value)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium">{item.label}</span>
              <span className="block text-xs text-slate-500">
                {item.description}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={submit} disabled={sending}>
          {sending ? "Đang xử lý..." : "Xác nhận thanh toán"}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Để sau
        </Button>
      </div>
    </Modal>
  );
}

/** Popup xác nhận huỷ đơn, kèm thông báo hoàn tiền nếu đã thanh toán. */
function CancelOrderModal({
  order,
  token,
  onClose,
  onDone,
}: {
  order: Order;
  token: string | null;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const notify = useNotify();
  const [sending, setSending] = useState(false);
  const alreadyPaid = order.paymentStatus === "PAID";

  const submit = async () => {
    setSending(true);
    try {
      await api<Order>(`/api/orders/${order.id}/cancel`, {
        method: "PUT",
        token,
      });
      notify(
        alreadyPaid
          ? `Đã huỷ đơn #${order.id}. ${REFUND_NOTICE}`
          : `Đã huỷ đơn #${order.id}.`,
        "success",
      );
      await onDone();
    } catch (error) {
      notify(errorMessage(error, "Không thể huỷ đơn hàng."), "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal title={`Huỷ đơn #${order.id}?`} onClose={onClose}>
      <p className="text-sm text-slate-700">
        Bạn có chắc chắn muốn huỷ đơn hàng này? Hành động này không thể hoàn
        tác.
      </p>

      <ul className="mt-3 space-y-1 text-sm text-slate-600">
        <li>
          Trạng thái hiện tại:{" "}
          <b>{statusLabels[order.status] ?? order.status}</b>
        </li>
        <li>
          Giá trị đơn: <b>{formatCurrency(order.totalAmount)}</b>
        </li>
        <li>
          Thanh toán:{" "}
          <b>{paymentLabels[order.paymentStatus] ?? order.paymentStatus}</b> qua{" "}
          {paymentMethodLabel(order.paymentMethod)}
        </li>
      </ul>

      <div className="mt-4 border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        {alreadyPaid
          ? REFUND_NOTICE
          : "Đơn chưa thanh toán nên không phát sinh hoàn tiền. Hàng sẽ được trả lại kho của shop."}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="danger" onClick={submit} disabled={sending}>
          {sending ? "Đang huỷ..." : "Xác nhận huỷ đơn"}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Không, giữ đơn hàng
        </Button>
      </div>
    </Modal>
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
