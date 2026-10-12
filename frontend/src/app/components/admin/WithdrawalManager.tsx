"use client";

import { useCallback, useState } from "react";
import { api, errorMessage, query } from "../../lib/api";
import { recordAudit } from "../../lib/audit";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { useLoadEffect } from "../../lib/hooks";
import { WALLET_METHOD_LABELS, WALLET_STATUS_LABELS, labelOf } from "../../lib/labels";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";
import type { WalletTransaction } from "../../lib/types";
import { Pager, usePaging } from "../Pager";
import { Badge, Button, Card, Empty, Select } from "../ui";
import { ReasonModal } from "./ReasonModal";

/** Duyệt hoặc từ chối yêu cầu rút tiền của người mua và người bán. */
export function WithdrawalManager() {
  const { token } = useSession();
  const notify = useNotify();
  const [items, setItems] = useState<WalletTransaction[]>([]);
  const [status, setStatus] = useState("PENDING");
  const [rejecting, setRejecting] = useState<WalletTransaction | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setItems(await api<WalletTransaction[]>(`/api/orders/admin/withdrawals${query({ status })}`, { token }));
    } catch (error) {
      notify(errorMessage(error, "Không thể tải yêu cầu rút tiền."), "error");
    }
  }, [token, status, notify]);

  useLoadEffect(load);

  const resolve = async (item: WalletTransaction, approve: boolean, note?: string) => {
    try {
      await api(`/api/orders/admin/withdrawals/${item.id}`, {
        method: "PUT",
        token,
        body: { approve, note: note ?? null },
      });
      notify(approve ? "Đã duyệt yêu cầu rút tiền." : "Đã từ chối và hoàn tiền về ví.", "success");
      recordAudit(
        token,
        approve ? "Duyệt rút tiền" : "Từ chối rút tiền",
        `Yêu cầu #${item.id} — tài khoản #${item.userId} — ${formatCurrency(Math.abs(item.amount))}${note ? ` — ${note}` : ""}`,
      );
      await load();
    } catch (error) {
      notify(errorMessage(error, "Không thể xử lý yêu cầu."), "error");
    }
  };

  const paging = usePaging(items, 10, status);

  return (
    <Card
      title="Yêu cầu rút tiền"
      action={
        <div className="w-48">
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { value: "PENDING", label: "Chờ duyệt" },
              { value: "COMPLETED", label: "Đã duyệt" },
              { value: "CANCELLED", label: "Đã từ chối" },
              { value: "", label: "Tất cả" },
            ]}
          />
        </div>
      }
    >
      {items.length === 0 ? (
        <Empty>Không có yêu cầu nào.</Empty>
      ) : (
        <div className="space-y-3">
          {paging.slice.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3 last:border-0"
            >
              <div className="text-sm">
                <p className="font-medium">
                  #{item.id} · tài khoản #{item.userId} · {formatCurrency(Math.abs(item.amount))}{" "}
                  <Badge
                    tone={item.status === "COMPLETED" ? "success" : item.status === "PENDING" ? "warning" : "danger"}
                  >
                    {labelOf(WALLET_STATUS_LABELS, item.status)}
                  </Badge>
                </p>
                <p className="text-xs text-slate-500">
                  {labelOf(WALLET_METHOD_LABELS, item.method ?? "")} · {formatDateTime(item.createdAt)}
                </p>
                {item.adminNote && <p className="text-xs text-rose-600">Ghi chú: {item.adminNote}</p>}
              </div>
              {item.status === "PENDING" && (
                <div className="flex gap-2">
                  <Button onClick={() => resolve(item, true)}>Duyệt</Button>
                  <Button variant="danger" onClick={() => setRejecting(item)}>
                    Từ chối
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <Pager page={paging.page} pageCount={paging.pageCount} total={paging.total} onPage={paging.setPage} />
      {rejecting && (
        <ReasonModal
          title={`Từ chối yêu cầu rút #${rejecting.id}`}
          description="Số tiền sẽ được hoàn lại vào ví của người dùng."
          confirmLabel="Xác nhận từ chối"
          onConfirm={async (reason) => {
            await resolve(rejecting, false, reason);
            setRejecting(null);
          }}
          onClose={() => setRejecting(null)}
        />
      )}
    </Card>
  );
}
