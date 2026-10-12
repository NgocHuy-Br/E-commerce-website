"use client";

import { useState } from "react";
import { PageHeader, RequireLogin, Card, Field, TextInput, Button } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { useSession } from "../../lib/session";
import { PasswordStrength } from "../../components/PasswordStrength";
import { useNotify } from "../../lib/toast";

export default function AccountSecurityPage() {
  const { token, session } = useSession();
  const notify = useNotify();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const changePassword = async () => {
    if (!token) return;
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
        <PageHeader title="Mật khẩu & bảo mật" back={false} />
        <RequireLogin
          next="/account/security"
          message="Đăng nhập để quản lý mật khẩu và bảo mật tài khoản."
        />
      </>
    );
  }

  return (
    <>
      <Card title="Thông tin đăng nhập">
        <div className="space-y-3">
          <Field label="Tên đăng nhập">
            <TextInput value={session.email} onChange={() => {}} readOnly />
          </Field>
          <p className="text-xs text-slate-500">Mật khẩu được ẩn theo mặc định. Bạn có thể bật hiển thị khi đổi mật khẩu.</p>
        </div>
      </Card>

      <Card title="Đổi mật khẩu" className="mt-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Mật khẩu hiện tại">
            <TextInput type="password" value={currentPassword} onChange={setCurrentPassword} showToggle />
          </Field>
          <Field label="Mật khẩu mới">
            <TextInput type="password" value={newPassword} onChange={setNewPassword} showToggle />
            <PasswordStrength value={newPassword} />
          </Field>
        </div>
        <Button className="mt-4" onClick={changePassword}>Lưu mật khẩu mới</Button>
      </Card>
    </>
  );
}
