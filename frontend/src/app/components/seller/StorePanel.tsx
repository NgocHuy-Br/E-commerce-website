"use client";

import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";
import {
  checkAddress,
  checkImageUrl,
  checkStorePhone,
  checkText,
  firstError,
} from "../../lib/validate";
import type { Store } from "../../lib/types";
import { Badge, Button, Card, Field, TextArea, TextInput } from "../ui";
import { ImageUpload } from "../ImageUpload";

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
  const [editing, setEditing] = useState(!store);

  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const submit = async () => {
    const problems = {
      name: checkText(form.name, "Tên cửa hàng"),
      phoneNumber: checkStorePhone(form.phoneNumber),
      address: checkAddress(form.address, "Địa chỉ"),
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
      setEditing(false);
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
      title={
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-teal-800">Cửa hàng của tôi</p>
          {store && <h2 className="mt-1 text-xl font-semibold text-slate-900">{store.name}</h2>}
        </div>
      }
      action={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {store ? (
            <Badge tone={statusTone[store.status] ?? "neutral"}>
              {statusLabels[store.status] ?? store.status}
            </Badge>
          ) : (
            <Badge tone="neutral">Chưa có cửa hàng</Badge>
          )}
          {store && !editing && (
            <Button variant="ghost" onClick={() => setEditing(true)}>Chỉnh sửa</Button>
          )}
        </div>
      }
      className="overflow-hidden border-t-4 border-t-teal-700"
    >
      {!store && (
        <p className="mb-3 text-sm text-slate-600">
          Đăng ký mở cửa hàng, admin duyệt xong bạn sẽ được cấp quyền SELLER để
          đăng bán.
        </p>
      )}
      {!editing && store ? (
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_160px]">
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <StoreDetail label="Địa chỉ" value={store.address} />
            <StoreDetail label="Số điện thoại" value={store.phoneNumber} />
            <div className="sm:col-span-2">
              <StoreDetail label="Giới thiệu" value={store.description || "Chưa có giới thiệu."} />
            </div>
          </div>
          <div className="flex aspect-square items-center justify-center overflow-hidden border border-stone-200 bg-stone-100 text-sm text-slate-400">
            {store.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" />
            ) : "Chưa có logo"}
          </div>
        </div>
      ) : (
      <>
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
      </div>
      <div className="mt-3">
        <ImageUpload
          label="Logo cửa hàng"
          value={form.logoUrl}
          onChange={(logoUrl) => setForm({ ...form, logoUrl })}
        />
      </div>
      <div className="mt-3">
        <Field label="Giới thiệu">
          <TextArea
            value={form.description}
            onChange={(value) => setForm({ ...form, description: value })}
          />
        </Field>
      </div>
      <div className="mt-4 flex gap-2">
        <Button onClick={submit}>
          {store ? "Lưu thay đổi" : "Gửi yêu cầu mở shop"}
        </Button>
        {store && (
          <Button variant="ghost" onClick={() => {
            setForm({
              name: store.name,
              description: store.description ?? "",
              address: store.address,
              phoneNumber: store.phoneNumber,
              logoUrl: store.logoUrl ?? "",
            });
            setErrors({});
            setEditing(false);
          }}>Huỷ</Button>
        )}
      </div>
      </>
      )}
    </Card>
  );
}

function StoreDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{value}</p>
    </div>
  );
}
