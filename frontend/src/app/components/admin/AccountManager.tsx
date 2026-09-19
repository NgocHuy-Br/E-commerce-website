"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useLoadEffect } from "../../lib/hooks";
import type { Notify } from "../../lib/session";
import type { Account, Role } from "../../lib/types";
import { Badge, Button, Card, Empty, TextInput } from "../ui";

const allRoles: Role[] = ["BUYER", "SELLER", "ADMIN"];

/** Quản lý tài khoản trên hệ thống: phân quyền và khoá/mở khoá. */
export function AccountManager({
  token,
  notify,
}: {
  token: string | null;
  notify: Notify;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [keyword, setKeyword] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setAccounts(await api<Account[]>("/api/auth/admin/accounts", { token }));
    } catch (error) {
      notify(
        errorMessage(error, "Không thể tải danh sách tài khoản."),
        "error",
      );
    }
  }, [token, notify]);

  useLoadEffect(load);

  const toggleRole = async (account: Account, role: Role) => {
    const roles = account.roles.includes(role)
      ? account.roles.filter((item) => item !== role)
      : [...account.roles, role];
    if (!roles.includes("BUYER")) roles.push("BUYER");
    try {
      await api(`/api/auth/admin/accounts/${account.id}/roles`, {
        method: "PUT",
        token,
        body: { roles },
      });
      notify(`Đã cập nhật quyền của ${account.email}.`, "success");
      await load();
    } catch (error) {
      notify(errorMessage(error, "Không thể cập nhật quyền."), "error");
    }
  };

  const toggleStatus = async (account: Account) => {
    const status = account.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
    try {
      await api(`/api/auth/admin/accounts/${account.id}/status`, {
        method: "PUT",
        token,
        body: { status },
      });
      notify(`Tài khoản ${account.email} → ${status}.`, "success");
      await load();
    } catch (error) {
      notify(errorMessage(error, "Không thể cập nhật trạng thái."), "error");
    }
  };

  const filtered = accounts.filter((account) =>
    account.email.toLowerCase().includes(keyword.trim().toLowerCase()),
  );

  return (
    <Card
      title={`Tài khoản hệ thống (${accounts.length})`}
      action={
        <div className="flex w-56 gap-2">
          <TextInput
            value={keyword}
            onChange={setKeyword}
            placeholder="Tìm theo email"
          />
        </div>
      }
    >
      {filtered.length === 0 ? (
        <Empty>Không có tài khoản phù hợp.</Empty>
      ) : (
        <div className="space-y-3">
          {filtered.map((account) => (
            <div
              key={account.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3 last:border-0"
            >
              <div className="text-sm">
                <p className="font-medium">
                  #{account.id} {account.email}{" "}
                  <Badge
                    tone={account.status === "ACTIVE" ? "success" : "danger"}
                  >
                    {account.status}
                  </Badge>
                </p>
                <p className="mt-1 flex flex-wrap gap-1">
                  {account.roles.map((role) => (
                    <Badge key={role} tone="info">
                      {role}
                    </Badge>
                  ))}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {allRoles
                  .filter((role) => role !== "BUYER")
                  .map((role) => (
                    <Button
                      key={role}
                      variant="ghost"
                      onClick={() => toggleRole(account, role)}
                    >
                      {account.roles.includes(role)
                        ? `Bỏ ${role}`
                        : `Cấp ${role}`}
                    </Button>
                  ))}
                <Button
                  variant={account.status === "ACTIVE" ? "danger" : "secondary"}
                  onClick={() => toggleStatus(account)}
                >
                  {account.status === "ACTIVE" ? "Khoá" : "Mở khoá"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
