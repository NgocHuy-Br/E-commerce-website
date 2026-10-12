"use client";

import { useCallback, useState } from "react";
import { api, errorMessage, query } from "../../lib/api";
import { useLoadEffect } from "../../lib/hooks";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";
import type { Store, StoreStatus } from "../../lib/types";
import { STORE_STATUS_LABELS } from "../../lib/labels";
import { Badge, Button, Card, Empty, Select } from "../ui";
import { Pager, usePaging } from "../Pager";
import { ReasonModal } from "./ReasonModal";
import { recordAudit } from "../../lib/audit";

/** Duyệt, từ chối, tạm ngưng cửa hàng. Duyệt ACTIVE sẽ cấp quyền SELLER cho chủ shop. */
export function StoreApproval() {
  const { token } = useSession();
  const notify = useNotify();
  const [stores, setStores] = useState<Store[]>([]);
  const [status, setStatus] = useState("");
  const [pendingAction, setPendingAction] = useState<{ store: Store; next: StoreStatus } | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setStores(
        await api<Store[]>(`/api/stores/admin${query({ status })}`, { token }),
      );
    } catch (error) {
      notify(errorMessage(error, "Không thể tải danh sách cửa hàng."), "error");
    }
  }, [token, status, notify]);

  useLoadEffect(load);

  const updateStatus = async (store: Store, next: StoreStatus, reason?: string) => {
    try {
      await api(`/api/stores/${store.id}/status`, {
        method: "PUT",
        token,
        body: { status: next, reason: reason ?? null },
      });
      notify(`Cửa hàng ${store.name} → ${STORE_STATUS_LABELS[next]}.`, "success");
      recordAudit(
        token,
        `Cửa hàng: ${STORE_STATUS_LABELS[next]}`,
        `${store.name} (#${store.id})${reason ? ` — ${reason}` : ""}`,
      );
      await load();
    } catch (error) {
      notify(errorMessage(error, "Không thể cập nhật cửa hàng."), "error");
    }
  };

  const paging = usePaging(stores, 10, status);

  return (
    <Card
      title="Cửa hàng trên sàn"
      action={
        <div className="w-48">
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { value: "", label: "Tất cả trạng thái" },
              { value: "PENDING", label: "Chờ duyệt" },
              { value: "ACTIVE", label: "Đang hoạt động" },
              { value: "REJECTED", label: "Đã từ chối" },
              { value: "SUSPENDED", label: "Tạm ngưng" },
            ]}
          />
        </div>
      }
    >
      {stores.length === 0 ? (
        <Empty>Không có cửa hàng nào.</Empty>
      ) : (
        <div className="space-y-3">
          {paging.slice.map((store) => (
            <div
              key={store.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3 last:border-0"
            >
              <div className="text-sm">
                <p className="font-medium">
                  #{store.id} {store.name}{" "}
                  <Badge
                    tone={
                      store.status === "ACTIVE"
                        ? "success"
                        : store.status === "PENDING"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {STORE_STATUS_LABELS[store.status]}
                  </Badge>
                </p>
                <p className="text-slate-600">
                  Chủ shop #{store.ownerId} · {store.phoneNumber} ·{" "}
                  {store.address}
                </p>
                {store.statusReason && (
                  <p className="text-xs text-rose-600">Lý do: {store.statusReason}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {store.status !== "ACTIVE" && (
                  <Button onClick={() => updateStatus(store, "ACTIVE")}>
                    Duyệt
                  </Button>
                )}
                {store.status === "PENDING" && (
                  <Button
                    variant="danger"
                    onClick={() => setPendingAction({ store, next: "REJECTED" })}
                  >
                    Từ chối
                  </Button>
                )}
                {store.status === "ACTIVE" && (
                  <Button
                    variant="danger"
                    onClick={() => setPendingAction({ store, next: "SUSPENDED" })}
                  >
                    Tạm ngưng
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Pager page={paging.page} pageCount={paging.pageCount} total={paging.total} onPage={paging.setPage} />
      {pendingAction && (
        <ReasonModal
          title={`${pendingAction.next === "REJECTED" ? "Từ chối" : "Tạm ngưng"} cửa hàng ${pendingAction.store.name}`}
          description="Chủ shop sẽ thấy lý do này trong trang Cửa hàng của họ."
          confirmLabel={pendingAction.next === "REJECTED" ? "Xác nhận từ chối" : "Xác nhận tạm ngưng"}
          onConfirm={async (reason) => {
            await updateStatus(pendingAction.store, pendingAction.next, reason);
            setPendingAction(null);
          }}
          onClose={() => setPendingAction(null)}
        />
      )}
    </Card>
  );
}
