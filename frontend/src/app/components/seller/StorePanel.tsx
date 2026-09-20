"use client";

import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";
import {
  checkImageUrl,
  checkPhone,
  checkText,
  firstError,
} from "../../lib/validate";
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
  store,
  onStoreChange,
}: {
  store: Store | null;
  onStoreChange: (store: Store) => void;
}) {
  const { token } = useSession();
  const notify = useNotify();
  // Component được parent remount qua prop key khi cửa hàng đổi, nên khởi tạo trực tiếp từ dữ liệu.
  const [form, setForm] = useState({
    name: store?.name ?? "",
    description: store?.description ?? "",
    address: store?.address ?? "",
    phoneNumber: store?.phoneNumber ?? "",
    logoUrl: store?.logoUrl ?? "",
  });

  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const submit = async () => {
    const problems = {
      name: checkText(form.name, "Tên cửa hàng"),
      phoneNumber: checkPhone(form.phoneNumber),
      address: checkText(form.address, "Địa chỉ"),
      logoUrl: checkImageUrl(form.logoUrl),
    };
    setErrors(problems);
    if (firstError(problems)) {
      return;
    }
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
        <Field label="Tên cửa hàng" error={errors.name}>
          <TextInput
            value={form.name}
            onChange={(value) => setForm({ ...form, name: value })}
            invalid={Boolean(errors.name)}
          />
        </Field>
        <Field label="Số điện thoại" error={errors.phoneNumber}>
          <TextInput
            value={form.phoneNumber}
            onChange={(value) => setForm({ ...form, phoneNumber: value })}
            digitsOnly
            invalid={Boolean(errors.phoneNumber)}
          />
        </Field>
        <Field label="Địa chỉ" error={errors.address}>
          <TextInput
            value={form.address}
            onChange={(value) => setForm({ ...form, address: value })}
            invalid={Boolean(errors.address)}
          />
        </Field>
        <Field label="Logo (URL)" error={errors.logoUrl}>
          <TextInput
            value={form.logoUrl}
            onChange={(value) => setForm({ ...form, logoUrl: value })}
            invalid={Boolean(errors.logoUrl)}
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
