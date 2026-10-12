import type { AccountStatus, ProductStatus, Role, StoreStatus } from "./types";

export const ROLE_LABELS: Record<Role, string> = {
  BUYER: "Người mua",
  SELLER: "Người bán",
  ADMIN: "Quản trị viên",
};

/** Tên vai trò hiển thị gọn: vừa mua vừa bán thì gọi là "Người mua bán". */
export function rolesSummary(roles: Role[]): string {
  if (roles.includes("ADMIN")) return ROLE_LABELS.ADMIN;
  if (roles.includes("SELLER") && roles.includes("BUYER")) return "Người mua bán";
  if (roles.includes("SELLER")) return ROLE_LABELS.SELLER;
  return ROLE_LABELS.BUYER;
}

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  ACTIVE: "Đang hoạt động",
  LOCKED: "Đã khoá",
};

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  ACTIVE: "Đang bán",
  HIDDEN: "Đã ẩn",
  OUT_OF_STOCK: "Hết hàng",
};

export const STORE_STATUS_LABELS: Record<StoreStatus, string> = {
  PENDING: "Chờ duyệt",
  ACTIVE: "Đang hoạt động",
  REJECTED: "Đã từ chối",
  SUSPENDED: "Tạm ngưng",
};

export const WALLET_TYPE_LABELS: Record<string, string> = {
  TOPUP: "Nạp tiền",
  WITHDRAW: "Rút tiền",
  ORDER_PAYMENT: "Thanh toán đơn hàng",
  SELLER_SETTLEMENT: "Doanh thu bán hàng",
  REFUND: "Hoàn tiền",
};

export const WALLET_STATUS_LABELS: Record<string, string> = {
  PENDING: "Đang xử lý",
  COMPLETED: "Hoàn tất",
  FAILED: "Thất bại",
  CANCELLED: "Đã huỷ",
};

export const WALLET_METHOD_LABELS: Record<string, string> = {
  VNPAY: "VNPay",
  VNPAY_MOCK: "VNPay",
  MOMO: "MoMo",
  MOMO_MOCK: "MoMo",
  BANK_TRANSFER: "Chuyển khoản ngân hàng",
  BANK_TRANSFER_MOCK: "Chuyển khoản ngân hàng",
  WALLET: "Ví của tôi",
};

export function labelOf(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}
