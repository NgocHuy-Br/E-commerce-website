"use client";

import { useState } from "react";
import { Button, Modal, TextArea } from "../ui";

/** Hỏi lý do trước khi từ chối, tạm ngưng hoặc khoá; lý do được gửi cho người bị ảnh hưởng. */
export function ReasonModal({
  title,
  description,
  confirmLabel,
  required = true,
  onConfirm,
  onClose,
}: {
  title: string;
  description?: string;
  confirmLabel: string;
  required?: boolean;
  onConfirm: (reason: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const missing = required && reason.trim().length < 5;

  return (
    <Modal title={title} onClose={onClose}>
      {description && <p className="mb-3 text-sm text-slate-600">{description}</p>}
      <TextArea value={reason} onChange={setReason} placeholder="Nhập lý do (tối thiểu 5 ký tự)..." />
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Huỷ
        </Button>
        <Button
          variant="danger"
          disabled={missing || sending}
          onClick={async () => {
            setSending(true);
            try {
              await onConfirm(reason.trim());
            } finally {
              setSending(false);
            }
          }}
        >
          {sending ? "Đang xử lý..." : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
