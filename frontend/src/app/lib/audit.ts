import { api } from "./api";

/** Ghi nhật ký thao tác quản trị; lỗi ghi log không được làm hỏng thao tác chính. */
export function recordAudit(token: string | null, action: string, detail?: string) {
  if (!token) return;
  void api("/api/orders/admin/audit", {
    method: "POST",
    token,
    body: { action, detail: detail ?? null },
  }).catch(() => undefined);
}
