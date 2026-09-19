"use client";

import { useState } from "react";
import { api, errorMessage } from "../lib/api";
import type { Notify } from "../lib/session";
import type { AuthResponse } from "../lib/types";
import { Badge, Button, Card, Field, TextInput } from "./ui";

/** Đăng ký, đăng nhập, đăng xuất và đổi mật khẩu. */
export function AccountPanel({
  session,
  onSignIn,
  onSignOut,
  notify,
}: {
  session: AuthResponse | null;
  onSignIn: (session: AuthResponse) => void;
  onSignOut: () => void;
  notify: Notify;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const authenticate = async (
    path: "/api/auth/register" | "/api/auth/login",
  ) => {
    setLoading(true);
    try {
      const result = await api<AuthResponse>(path, {
        method: "POST",
        body: { email, password },
      });
      onSignIn(result);
      setPassword("");
      notify(
        `${path.endsWith("register") ? "Đăng ký" : "Đăng nhập"} thành công: ${result.email}`,
        "success",
      );
    } catch (error) {
      notify(errorMessage(error, "Không thể xác thực tài khoản."), "error");
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    try {
      await api("/api/auth/me/password", {
        method: "PUT",
        token: session?.accessToken,
        body: { currentPassword, newPassword },
      });
      setCurrentPassword("");
      setNewPassword("");
      setChangingPassword(false);
      notify("Đã đổi mật khẩu.", "success");
    } catch (error) {
      notify(errorMessage(error, "Không thể đổi mật khẩu."), "error");
    }
  };

  if (!session) {
    return (
      <Card title="Tài khoản">
        <div className="space-y-3">
          <Field label="Email">
            <TextInput
              value={email}
              onChange={setEmail}
              placeholder="ban@example.com"
            />
          </Field>
          <Field label="Mật khẩu">
            <TextInput
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Ít nhất 6 ký tự"
              onEnter={() => authenticate("/api/auth/login")}
            />
          </Field>
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => authenticate("/api/auth/login")}
            disabled={loading}
          >
            Đăng nhập
          </Button>
          <Button
            variant="secondary"
            onClick={() => authenticate("/api/auth/register")}
            disabled={loading}
          >
            Đăng ký
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Tài khoản"
      action={
        <Button variant="ghost" onClick={onSignOut}>
          Đăng xuất
        </Button>
      }
    >
      <p className="text-sm font-medium">{session.email}</p>
      <div className="mt-2 flex flex-wrap gap-1">
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

      {changingPassword ? (
        <div className="mt-4 space-y-3 border-t border-stone-200 pt-4">
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
          <div className="flex gap-2">
            <Button onClick={changePassword}>Lưu</Button>
            <Button variant="ghost" onClick={() => setChangingPassword(false)}>
              Huỷ
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => setChangingPassword(true)}
        >
          Đổi mật khẩu
        </Button>
      )}
    </Card>
  );
}
