"use client";

import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import type { Notify } from "../../lib/session";
import type { Store } from "../../lib/types";
import { Badge, Button, Card, Field, TextArea, TextInput } from "../ui";

const statusTone: Record<string, "success" | "warning" | "danger"> = {
  ACTIVE: "success",
  PENDING: "warning",
  REJECTED: "danger",
  SUSPENDED: "danger",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  PENDING: "Chờ admin duyệt",
  REJECTED: "Bị từ chối",
  SUSPENDED: "Bị tạm ngưng",
};

/** Người bán mở shop và cập nhật thông tin cửa hàng của mình. */
export function StorePanel({
  token,
  store,
  onStoreChange,
  notify,
}: {
  token: string | null;
  store: Store | null;
  onStoreChange: (store: Store) => void;
  notify: Notify;
}) {
  // Component được parent remount qua prop key khi cửa hàng đổi, nên khởi tạo trực tiếp từ dữ liệu.
  const [form, setForm] = useState({
    name: store?.name ?? "",
    description: store?.description ?? "",
    address: store?.address ?? "",
    phoneNumber: store?.phoneNumber ?? "",
    logoUrl: store?.logoUrl ?? "",
  });

  const submit = async () => {
    try {
      const saved = await api<Store>(
        store ? "/api/stores/mine" : "/api/stores",
        {
          method: store ? "PUT" : "POST",
          token,
          body: {
            ...form,
            logoUrl: form.logoUrl || null,
            description: form.description || null,
          },
        },
      );
      onStoreChange(saved);
      notify(
        store
          ? "Đã cập nhật cửa hàng."
          : "Đã gửi yêu cầu mở shop, chờ admin duyệt.",
        "success",
      );
    } catch (error) {
      notify(errorMessage(error, "Không thể lưu cửa hàng."), "error");
    }
  };

  return (
    <Card
      title="Cửa hàng của tôi"
      action={
        store ? (
          <Badge tone={statusTone[store.status] ?? "neutral"}>
            {statusLabels[store.status] ?? store.status}
          </Badge>
        ) : (
          <Badge tone="neutral">Chưa có cửa hàng</Badge>
        )
      }
    >
      {!store && (
        <p className="mb-3 text-sm text-slate-600">
          Đăng ký mở cửa hàng, admin duyệt xong bạn sẽ được cấp quyền SELLER để
          đăng bán.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tên cửa hàng">
          <TextInput
            value={form.name}
            onChange={(value) => setForm({ ...form, name: value })}
          />
        </Field>
        <Field label="Số điện thoại">
          <TextInput
            value={form.phoneNumber}
            onChange={(value) => setForm({ ...form, phoneNumber: value })}
          />
        </Field>
        <Field label="Địa chỉ">
          <TextInput
            value={form.address}
            onChange={(value) => setForm({ ...form, address: value })}
          />
        </Field>
        <Field label="Logo (URL)">
          <TextInput
            value={form.logoUrl}
            onChange={(value) => setForm({ ...form, logoUrl: value })}
          />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Giới thiệu">
          <TextArea
            value={form.description}
            onChange={(value) => setForm({ ...form, description: value })}
          />
        </Field>
      </div>
      <Button className="mt-4" onClick={submit}>
        {store ? "Lưu thay đổi" : "Gửi yêu cầu mở shop"}
      </Button>
    </Card>
  );
}
