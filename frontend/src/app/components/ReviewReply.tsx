"use client";

import { useState } from "react";
import { api, errorMessage } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { Button, TextArea } from "./ui";

/** Hiển thị phản hồi của người bán; chủ shop bấm để viết hoặc sửa phản hồi. */
export function SellerReply({
  review,
  canReply,
  token,
  onDone,
  notify,
}: {
  review: { id: number; sellerReply: string | null; sellerRepliedAt: string | null };
  canReply: boolean;
  token: string | null;
  onDone: () => Promise<void>;
  notify: (message: string, tone?: "info" | "success" | "error") => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(review.sellerReply ?? "");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setSending(true);
    try {
      await api(`/api/orders/reviews/${review.id}/reply`, {
        method: "PUT",
        token,
        body: { reply: text },
      });
      notify("Đã gửi phản hồi.", "success");
      setEditing(false);
      await onDone();
    } catch (error) {
      notify(errorMessage(error, "Không thể gửi phản hồi."), "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-2">
      {review.sellerReply && !editing && (
        <div className="border-l-2 border-teal-600 bg-stone-50 px-3 py-2 text-sm">
          <p className="text-xs font-medium text-teal-800">
            Phản hồi của người bán
            {review.sellerRepliedAt ? ` · ${formatDateTime(review.sellerRepliedAt)}` : ""}
          </p>
          <p className="mt-1 whitespace-pre-line text-slate-700">{review.sellerReply}</p>
        </div>
      )}
      {canReply && !editing && (
        <Button variant="ghost" className="mt-1 px-2 py-1" onClick={() => setEditing(true)}>
          {review.sellerReply ? "Sửa phản hồi" : "Phản hồi"}
        </Button>
      )}
      {canReply && editing && (
        <div className="mt-2 space-y-2">
          <TextArea value={text} onChange={setText} placeholder="Nhập phản hồi của shop..." />
          <div className="flex gap-2">
            <Button onClick={submit} disabled={sending || !text.trim()}>
              {sending ? "Đang gửi..." : "Gửi phản hồi"}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Huỷ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
