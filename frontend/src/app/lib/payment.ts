import type { PaymentMethod } from "./types";

/** Các phương thức thanh toán dùng chung cho trang giỏ hàng và trang đơn hàng. */
export const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  description: string;
  payOnDelivery: boolean;
}[] = [
  {
    value: "COD",
    label: "COD - thanh toán khi nhận hàng",
    description: "Trả tiền mặt cho nhân viên giao hàng.",
    payOnDelivery: true,
  },
  {
    value: "BANK_TRANSFER",
    label: "Chuyển khoản ngân hàng",
    description:
      "Chuyển tới số tài khoản của sàn, hệ thống ghi nhận đã thanh toán.",
    payOnDelivery: false,
  },
  {
    value: "MOMO",
    label: "Ví MoMo",
    description: "Thanh toán qua ví điện tử MoMo.",
    payOnDelivery: false,
  },
  {
    value: "CREDIT_CARD",
    label: "Thẻ tín dụng / ghi nợ",
    description: "Hỗ trợ Visa, Mastercard, JCB.",
    payOnDelivery: false,
  },
];

export function paymentMethodLabel(
  method: PaymentMethod | null | undefined,
): string {
  return (
    PAYMENT_METHODS.find((item) => item.value === method)?.label ??
    String(method ?? "-")
  );
}

/** Câu thông báo hoàn tiền khi huỷ đơn đã thanh toán. */
export const REFUND_NOTICE =
  "Số tiền đã thanh toán sẽ được hoàn về tài khoản ngân hàng của bạn trong 1-3 ngày làm việc.";
