"use client";

import { useState } from "react";
import { ProfilePanel } from "../components/buyer/ProfilePanel";
import {
  Badge,
  Button,
  Card,
  Field,
  PageHeader,
  RequireLogin,
  TextInput,
} from "../components/ui";
import { api, errorMessage } from "../lib/api";
import { useSession } from "../lib/session";
import { useNotify } from "../lib/toast";

export default function AccountPage() {
  const { session, token } = useSession();
  const notify = useNotify();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const changePassword = async () => {
    try {
      await api("/api/auth/me/password", {
        method: "PUT",
        token,
        body: { currentPassword, newPassword },
      });
      setCurrentPassword("");
      setNewPassword("");
      notify("Đã đổi mật khẩu.", "success");
    } catch (error) {
      notify(errorMessage(error, "Không thể đổi mật khẩu."), "error");
    }
  };

  if (!token || !session) {
    return (
      <>
        <PageHeader title="Tài khoản" />
        <RequireLogin
          next="/account"
          message="Đăng nhập để quản lý tài khoản của bạn."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Tài khoản của tôi"
        action={
          <div className="flex flex-wrap gap-1">
            {session.roles.map((role) => (
              <Badge
                key={role}
                tone={
                  role === "ADMIN"
                    ? "danger"
                    : role === "SELLER"
                      ? "info"
                      : "success"
                }
              >
                {role}
              </Badge>
            ))}
          </div>
        }
      />

      <div className="space-y-5">
        <ProfilePanel />

        <Card title="Đổi mật khẩu">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mật khẩu hiện tại">
              <TextInput
                type="password"
                value={currentPassword}
                onChange={setCurrentPassword}
              />
            </Field>
            <Field label="Mật khẩu mới">
              <TextInput
                type="password"
                value={newPassword}
                onChange={setNewPassword}
              />
            </Field>
          </div>
          <Button className="mt-4" onClick={changePassword}>
            Lưu mật khẩu mới
          </Button>
        </Card>
      </div>
    </>
  );
}
