"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useLoadEffect } from "../../lib/hooks";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";
import { Button, Card, Field, TextInput } from "../ui";
import { recordAudit } from "../../lib/audit";

/** Cài đặt toàn sàn: tỷ lệ phí nền tảng giữ lại trên mỗi đơn bán thành công. */
export function SystemSettings() {
  const { token } = useSession();
  const notify = useNotify();
  const [percent, setPercent] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const result = await api<{ commissionPercent: number }>(
        "/api/orders/commission",
        { token },
      );
      setPercent(String(result.commissionPercent));
    } catch (error) {
      notify(errorMessage(error, "Không thể tải cài đặt."), "error");
    }
  }, [token, notify]);

  useLoadEffect(load);

  const save = async () => {
    const value = Number(percent.replace(",", "."));
    if (!Number.isFinite(value) || value < 0 || value > 50) {
      notify("Phí nền tảng phải từ 0 đến 50%.", "error");
      return;
    }
    setSaving(true);
    try {
      await api("/api/orders/admin/commission", {
        method: "PUT",
        token,
        body: { commissionPercent: value },
      });
      notify(`Đã đặt phí nền tảng ${value}%.`, "success");
      recordAudit(token, "Đổi phí nền tảng", `${value}%`);
      await load();
    } catch (error) {
      notify(errorMessage(error, "Không thể lưu cài đặt."), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Phí nền tảng">
      <p className="mb-4 text-sm text-slate-600">
        Nền tảng giữ lại tỷ lệ này trên giá trị mỗi đơn hàng (sau khi trừ mã
        giảm giá). Người bán nhận phần còn lại. Tỷ lệ mới chỉ áp dụng cho đơn
        đặt sau khi thay đổi; đơn cũ giữ tỷ lệ đã chốt lúc đặt.
      </p>
      <div className="flex max-w-sm items-end gap-3">
        <div className="flex-1">
          <Field label="Phí nền tảng (%)">
            <TextInput
              type="number"
              value={percent}
              onChange={setPercent}
              onEnter={save}
            />
          </Field>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
    </Card>
  );
}
