"use client";

import { useCallback, useState } from "react";
import { api, errorMessage, query } from "../../lib/api";
import { useLoadEffect } from "../../lib/hooks";
import type { Notify } from "../../lib/session";
import type { Store, StoreStatus } from "../../lib/types";
import { Badge, Button, Card, Empty, Select } from "../ui";

/** Duyệt, từ chối, tạm ngưng cửa hàng. Duyệt ACTIVE sẽ cấp quyền SELLER cho chủ shop. */
export function StoreApproval({
  token,
  notify,
}: {
  token: string | null;
  notify: Notify;
}) {
  const [stores, setStores] = useState<Store[]>([]);
  const [status, setStatus] = useState("");

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

  const updateStatus = async (store: Store, next: StoreStatus) => {
    try {
      await api(`/api/stores/${store.id}/status`, {
        method: "PUT",
        token,
        body: { status: next },
      });
      notify(`Cửa hàng ${store.name} → ${next}.`, "success");
      await load();
    } catch (error) {
      notify(errorMessage(error, "Không thể cập nhật cửa hàng."), "error");
    }
  };

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
          {stores.map((store) => (
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
                    {store.status}
                  </Badge>
                </p>
                <p className="text-slate-600">
                  Chủ shop #{store.ownerId} · {store.phoneNumber} ·{" "}
                  {store.address}
                </p>
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
                    onClick={() => updateStatus(store, "REJECTED")}
                  >
                    Từ chối
                  </Button>
                )}
                {store.status === "ACTIVE" && (
                  <Button
                    variant="danger"
                    onClick={() => updateStatus(store, "SUSPENDED")}
                  >
                    Tạm ngưng
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
