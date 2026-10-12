"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useLoadEffect } from "../../lib/hooks";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";
import type { Account, Role } from "../../lib/types";
import { ACCOUNT_STATUS_LABELS, ROLE_LABELS } from "../../lib/labels";
import { Badge, Button, Card, Empty, TextInput } from "../ui";
import { Pager, usePaging } from "../Pager";
import { ReasonModal } from "./ReasonModal";
import { recordAudit } from "../../lib/audit";

const allRoles: Role[] = ["BUYER", "SELLER", "ADMIN"];

/** Quản lý tài khoản trên hệ thống: phân quyền và khoá/mở khoá. */
export function AccountManager() {
  const { token } = useSession();
  const notify = useNotify();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [keyword, setKeyword] = useState("");
  const [locking, setLocking] = useState<Account | null>(null);

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
      recordAudit(token, "Đổi quyền tài khoản", `${account.email} → ${roles.map((r) => ROLE_LABELS[r]).join(", ")}`);
      await load();
    } catch (error) {
      notify(errorMessage(error, "Không thể cập nhật quyền."), "error");
    }
  };

  const setStatus = async (account: Account, status: "ACTIVE" | "LOCKED", reason?: string) => {
    try {
      await api(`/api/auth/admin/accounts/${account.id}/status`, {
        method: "PUT",
        token,
        body: { status, reason: reason ?? null },
      });
      notify(`Tài khoản ${account.email} → ${ACCOUNT_STATUS_LABELS[status]}.`, "success");
      recordAudit(
        token,
        status === "LOCKED" ? "Khoá tài khoản" : "Mở khoá tài khoản",
        `${account.email}${reason ? ` — ${reason}` : ""}`,
      );
      await load();
    } catch (error) {
      notify(errorMessage(error, "Không thể cập nhật trạng thái."), "error");
    }
  };

  const toggleStatus = (account: Account) => {
    if (account.status === "ACTIVE") {
      setLocking(account);
    } else {
      void setStatus(account, "ACTIVE");
    }
  };

  const filtered = accounts.filter((account) =>
    account.email.toLowerCase().includes(keyword.trim().toLowerCase()),
  );
  const paging = usePaging(filtered, 10, keyword);

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
          {paging.slice.map((account) => (
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
                    {ACCOUNT_STATUS_LABELS[account.status]}
                  </Badge>
                </p>
                <p className="mt-1 flex flex-wrap gap-1">
                  {account.roles.map((role) => (
                    <Badge key={role} tone="info">
                      {ROLE_LABELS[role]}
                    </Badge>
                  ))}
                </p>
                {account.status === "LOCKED" && account.lockReason && (
                  <p className="mt-1 text-xs text-rose-600">Lý do khoá: {account.lockReason}</p>
                )}
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
                        ? `Bỏ ${ROLE_LABELS[role]}`
                        : `Cấp ${ROLE_LABELS[role]}`}
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
      <Pager page={paging.page} pageCount={paging.pageCount} total={paging.total} onPage={paging.setPage} />
      {locking && (
        <ReasonModal
          title={`Khoá tài khoản ${locking.email}`}
          description="Người dùng sẽ thấy lý do này khi đăng nhập."
          confirmLabel="Xác nhận khoá"
          onConfirm={async (reason) => {
            await setStatus(locking, "LOCKED", reason);
            setLocking(null);
          }}
          onClose={() => setLocking(null)}
        />
      )}
    </Card>
  );
}
