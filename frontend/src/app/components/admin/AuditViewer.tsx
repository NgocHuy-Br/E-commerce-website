"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import { useLoadEffect } from "../../lib/hooks";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";
import type { AuditLog } from "../../lib/types";
import { Pager, usePaging } from "../Pager";
import { Button, Card, Empty, TextInput } from "../ui";

/** Nhật ký thao tác của quản trị viên. */
export function AuditViewer() {
  const { token } = useSession();
  const notify = useNotify();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [keyword, setKeyword] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLogs(await api<AuditLog[]>("/api/orders/admin/audit", { token }));
    } catch (error) {
      notify(errorMessage(error, "Không thể tải nhật ký."), "error");
    }
  }, [token, notify]);

  useLoadEffect(load);

  const needle = keyword.trim().toLowerCase();
  const shown = logs.filter(
    (log) =>
      !needle ||
      log.action.toLowerCase().includes(needle) ||
      (log.detail ?? "").toLowerCase().includes(needle) ||
      log.adminEmail.toLowerCase().includes(needle),
  );
  const paging = usePaging(shown, 15, needle);

  return (
    <Card
      title="Nhật ký thao tác"
      action={
        <div className="flex items-center gap-2">
          <div className="w-52">
            <TextInput value={keyword} onChange={setKeyword} placeholder="Tìm thao tác, người làm" />
          </div>
          <Button variant="ghost" onClick={load}>
            Làm mới
          </Button>
        </div>
      }
    >
      {shown.length === 0 ? (
        <Empty>Chưa có thao tác nào được ghi lại.</Empty>
      ) : (
        <ul className="divide-y divide-stone-100 text-sm">
          {paging.slice.map((log) => (
            <li key={log.id} className="py-2">
              <p className="font-medium">{log.action}</p>
              {log.detail && <p className="text-slate-600">{log.detail}</p>}
              <p className="text-xs text-slate-400">
                {log.adminEmail} · {formatDateTime(log.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <Pager page={paging.page} pageCount={paging.pageCount} total={paging.total} onPage={paging.setPage} />
      <p className="mt-3 text-xs text-slate-400">Hiển thị tối đa 200 thao tác gần nhất.</p>
    </Card>
  );
}
