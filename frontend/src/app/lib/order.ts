import type { OrderStatus, PaymentStatus } from "./types";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PACKING: "Đang đóng gói",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã nhận hàng",
  CANCELLED: "Đã huỷ",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Chưa thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "Thanh toán lỗi",
  REFUNDED: "Đã hoàn tiền",
};

/**
 * Các bước chuyển trạng thái được backend cho phép.
 * Từ SHIPPING trở đi đơn không còn huỷ được nữa (kể cả người bán và quản trị viên).
 */
export const ALLOWED_NEXT_STATUSES: Record<
  OrderStatus,
  { status: OrderStatus; label: string }[]
> = {
  PENDING: [
    { status: "CONFIRMED", label: "Xác nhận đơn" },
    { status: "CANCELLED", label: "Huỷ đơn" },
  ],
  CONFIRMED: [
    { status: "PACKING", label: "Đóng gói" },
    { status: "CANCELLED", label: "Huỷ đơn" },
  ],
  PACKING: [
    { status: "SHIPPING", label: "Giao cho vận chuyển" },
    { status: "CANCELLED", label: "Huỷ đơn" },
  ],
  SHIPPING: [{ status: "DELIVERED", label: "Đã giao xong" }],
  DELIVERED: [],
  CANCELLED: [],
};

/** Người mua chỉ huỷ được khi shop chưa giao cho vận chuyển. */
export const CANCELLABLE_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PACKING",
];

export function canCancel(status: OrderStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}

/** Lý do không huỷ được, hiển thị thay cho nút huỷ. */
export function cancelBlockedReason(status: OrderStatus): string | null {
  switch (status) {
    case "SHIPPING":
      return "Đơn đang trên đường giao nên không thể huỷ.";
    case "DELIVERED":
      return "Đơn đã giao xong nên không thể huỷ.";
    default:
      return null;
  }
}
