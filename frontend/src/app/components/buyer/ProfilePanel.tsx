"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useLoadEffect } from "../../lib/hooks";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";
import {
  checkAddress,
  checkImageUrl,
  checkName,
  checkPhone,
  firstError,
} from "../../lib/validate";
import type { Address, Profile } from "../../lib/types";
import { Badge, Button, Card, Empty, Field, TextInput } from "../ui";

const emptyAddress = {
  recipientName: "",
  phoneNumber: "",
  detail: "",
  ward: "",
  district: "",
  city: "",
  defaultAddress: false,
};

/** Quản lý thông tin cá nhân và sổ địa chỉ giao hàng. */
export function ProfilePanel() {
  const { token } = useSession();
  const notify = useNotify();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState({ ...emptyAddress });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [profileData, addressData] = await Promise.all([
        api<Profile>("/api/users/me", { token }),
        api<Address[]>("/api/users/me/addresses", { token }),
      ]);
      setProfile(profileData);
      setFullName(profileData.fullName ?? "");
      setPhoneNumber(profileData.phoneNumber ?? "");
      setAvatarUrl(profileData.avatarUrl ?? "");
      setAddresses(addressData);
    } catch (error) {
      notify(errorMessage(error, "Không thể tải thông tin cá nhân."), "error");
    }
  }, [token, notify]);

  useLoadEffect(load);

  const saveProfile = async () => {
    const problems = {
      fullName: checkName(fullName, "Họ tên", false),
      phoneNumber: checkPhone(phoneNumber, false),
      avatarUrl: checkImageUrl(avatarUrl),
    };
    setErrors(problems);
    if (firstError(problems)) {
      return;
    }
    try {
      const updated = await api<Profile>("/api/users/me", {
        method: "PUT",
        token,
        body: { fullName, phoneNumber, avatarUrl: avatarUrl || null },
      });
      setProfile(updated);
      notify("Đã cập nhật thông tin cá nhân.", "success");
    } catch (error) {
      notify(errorMessage(error, "Không thể cập nhật thông tin."), "error");
    }
  };

  const saveAddress = async () => {
    const problems = {
      recipientName: checkName(form.recipientName, "Tên người nhận"),
      addressPhone: checkPhone(form.phoneNumber),
      detail: checkAddress(form.detail, "Số nhà, đường"),
      ward: checkAddress(form.ward, "Phường/xã"),
      district: checkAddress(form.district, "Quận/huyện"),
      city: checkAddress(form.city, "Tỉnh/thành phố"),
    };
    setErrors(problems);
    if (firstError(problems)) {
      return;
    }
    try {
      const path = editingId
        ? `/api/users/me/addresses/${editingId}`
        : "/api/users/me/addresses";
      await api<Address>(path, {
        method: editingId ? "PUT" : "POST",
        token,
        body: form,
      });
      setForm({ ...emptyAddress });
      setEditingId(null);
      notify(
        editingId ? "Đã cập nhật địa chỉ." : "Đã thêm địa chỉ.",
        "success",
      );
      await load();
    } catch (error) {
      notify(errorMessage(error, "Không thể lưu địa chỉ."), "error");
    }
  };

  const deleteAddress = async (addressId: number) => {
    try {
      await api(`/api/users/me/addresses/${addressId}`, {
        method: "DELETE",
        token,
      });
      notify("Đã xoá địa chỉ.", "success");
      await load();
    } catch (error) {
      notify(errorMessage(error, "Không thể xoá địa chỉ."), "error");
    }
  };

  return (
    <div className="space-y-5">
      <Card title="Thông tin cá nhân">
        <p className="mb-3 text-sm text-slate-500">
          Email: {profile?.email ?? "-"}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Họ tên" error={errors.fullName}>
            <TextInput
              value={fullName}
              onChange={setFullName}
              placeholder="Nguyễn Văn A"
              invalid={Boolean(errors.fullName)}
            />
          </Field>
          <Field label="Số điện thoại" error={errors.phoneNumber}>
            <TextInput
              value={phoneNumber}
              onChange={setPhoneNumber}
              placeholder="09xxxxxxxx"
              digitsOnly
              invalid={Boolean(errors.phoneNumber)}
            />
          </Field>
          <Field label="Ảnh đại diện (URL)" error={errors.avatarUrl}>
            <TextInput
              value={avatarUrl}
              onChange={setAvatarUrl}
              placeholder="https://..."
              invalid={Boolean(errors.avatarUrl)}
            />
          </Field>
        </div>
        <Button className="mt-4" onClick={saveProfile}>
          Lưu thông tin
        </Button>
      </Card>

      <Card title="Sổ địa chỉ">
        {addresses.length === 0 ? (
          <Empty>Chưa có địa chỉ nào.</Empty>
        ) : (
          <ul className="space-y-2">
            {addresses.map((address) => (
              <li
                key={address.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2 last:border-0"
              >
                <div className="text-sm">
                  <p className="font-medium">
                    {address.recipientName} · {address.phoneNumber}{" "}
                    {address.defaultAddress && (
                      <Badge tone="success">Mặc định</Badge>
                    )}
                  </p>
                  <p className="text-slate-600">
                    {address.detail}, {address.ward}, {address.district},{" "}
                    {address.city}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingId(address.id);
                      setForm({
                        recipientName: address.recipientName,
                        phoneNumber: address.phoneNumber,
                        detail: address.detail,
                        ward: address.ward,
                        district: address.district,
                        city: address.city,
                        defaultAddress: address.defaultAddress,
                      });
                    }}
                  >
                    Sửa
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => deleteAddress(address.id)}
                  >
                    Xoá
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 grid gap-3 border-t border-stone-200 pt-4 sm:grid-cols-3">
          <Field label="Người nhận" error={errors.recipientName}>
            <TextInput
              value={form.recipientName}
              onChange={(value) => setForm({ ...form, recipientName: value })}
              invalid={Boolean(errors.recipientName)}
            />
          </Field>
          <Field label="Số điện thoại" error={errors.addressPhone}>
            <TextInput
              value={form.phoneNumber}
              onChange={(value) => setForm({ ...form, phoneNumber: value })}
              digitsOnly
              invalid={Boolean(errors.addressPhone)}
            />
          </Field>
          <Field label="Số nhà, đường" error={errors.detail}>
            <TextInput
              value={form.detail}
              onChange={(value) => setForm({ ...form, detail: value })}
              invalid={Boolean(errors.detail)}
            />
          </Field>
          <Field label="Phường/Xã" error={errors.ward}>
            <TextInput
              value={form.ward}
              onChange={(value) => setForm({ ...form, ward: value })}
              invalid={Boolean(errors.ward)}
            />
          </Field>
          <Field label="Quận/Huyện" error={errors.district}>
            <TextInput
              value={form.district}
              onChange={(value) => setForm({ ...form, district: value })}
              invalid={Boolean(errors.district)}
            />
          </Field>
          <Field label="Tỉnh/Thành phố" error={errors.city}>
            <TextInput
              value={form.city}
              onChange={(value) => setForm({ ...form, city: value })}
              invalid={Boolean(errors.city)}
            />
          </Field>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.defaultAddress}
            onChange={(event) =>
              setForm({ ...form, defaultAddress: event.target.checked })
            }
          />
          Đặt làm địa chỉ mặc định
        </label>
        <div className="mt-3 flex gap-2">
          <Button onClick={saveAddress}>
            {editingId ? "Cập nhật địa chỉ" : "Thêm địa chỉ"}
          </Button>
          {editingId && (
            <Button
              variant="ghost"
              onClick={() => {
                setEditingId(null);
                setForm({ ...emptyAddress });
              }}
            >
              Huỷ
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
