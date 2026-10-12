"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import { useLoadEffect } from "../../lib/hooks";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";
import type { Review } from "../../lib/types";
import { Stars } from "../Stars";
import { Badge, Button, Card, Empty, Select, TextInput } from "../ui";
import { Pager, usePaging } from "../Pager";
import { recordAudit } from "../../lib/audit";

/** Admin ẩn bình luận hoặc gỡ đánh giá vi phạm; có thể khôi phục lại. */
export function ReviewModeration() {
  const { token } = useSession();
  const notify = useNotify();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState("");
  const [keyword, setKeyword] = useState("");
  const [reasons, setReasons] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setReviews(await api<Review[]>("/api/orders/admin/reviews", { token }));
    } catch (error) {
      notify(errorMessage(error, "Không thể tải đánh giá."), "error");
    }
  }, [token, notify]);

  useLoadEffect(load);

  const moderate = async (
    review: Review,
    commentHidden: boolean,
    removed: boolean,
    message: string,
  ) => {
    try {
      await api(`/api/orders/reviews/${review.id}/moderation`, {
        method: "PUT",
        token,
        body: {
          commentHidden,
          removed,
          reason: reasons[review.id]?.trim() || "Vi phạm quy định cộng đồng",
        },
      });
      notify(message, "success");
      recordAudit(token, message.replace(/\.$/, ""), `Đánh giá #${review.id} (sản phẩm #${review.productId})${reasons[review.id]?.trim() ? ` — ${reasons[review.id].trim()}` : ""}`);
      await load();
    } catch (error) {
      notify(errorMessage(error, "Không thể cập nhật đánh giá."), "error");
    }
  };

  const needle = keyword.trim().toLowerCase();
  const shown = reviews
    .filter((review) =>
      filter === "removed"
        ? review.removed
        : filter === "hidden"
          ? review.commentHidden
          : filter === "normal"
            ? !review.removed && !review.commentHidden
            : true,
    )
    .filter(
      (review) =>
        !needle ||
        (review.comment ?? "").toLowerCase().includes(needle) ||
        String(review.productId) === needle,
    );
  const paging = usePaging(shown, 10, `${filter}|${needle}`);

  return (
    <Card
      title="Kiểm duyệt đánh giá"
      action={
        <div className="flex items-center gap-2">
          <div className="w-48">
            <TextInput value={keyword} onChange={setKeyword} placeholder="Từ khoá hoặc mã sản phẩm" />
          </div>
          <div className="w-48">
            <Select
              value={filter}
              onChange={setFilter}
              options={[
                { value: "", label: "Tất cả" },
                { value: "normal", label: "Đang hiển thị" },
                { value: "hidden", label: "Đã ẩn bình luận" },
                { value: "removed", label: "Đã gỡ đánh giá" },
              ]}
            />
          </div>
        </div>
      }
    >
      {shown.length === 0 ? (
        <Empty>Không có đánh giá nào.</Empty>
      ) : (
        <ul className="divide-y divide-stone-100">
          {paging.slice.map((review) => (
            <li key={review.id} className="space-y-2 py-3 first:pt-0">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Stars rating={review.rating} />
                <Link
                  href={`/products/${review.productId}`}
                  className="text-teal-800 hover:underline"
                >
                  Sản phẩm #{review.productId}
                </Link>
                <span className="text-xs text-slate-400">
                  {formatDateTime(review.createdAt)}
                </span>
                {review.removed && <Badge tone="danger">Đã gỡ đánh giá</Badge>}
                {review.commentHidden && (
                  <Badge tone="warning">Đã ẩn bình luận</Badge>
                )}
              </div>
              <p className="text-sm text-slate-700">
                {review.comment || "(không có nhận xét)"}
              </p>
              {review.sellerReply && (
                <p className="border-l-2 border-teal-600 pl-3 text-sm text-slate-600">
                  Phản hồi của shop: {review.sellerReply}
                </p>
              )}
              {review.moderationReason && (
                <p className="text-xs text-rose-600">
                  Lý do: {review.moderationReason}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-64">
                  <TextInput
                    value={reasons[review.id] ?? ""}
                    onChange={(value) =>
                      setReasons((current) => ({ ...current, [review.id]: value }))
                    }
                    placeholder="Lý do vi phạm (tuỳ chọn)"
                  />
                </div>
                {!review.commentHidden && !review.removed && (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      moderate(review, true, false, "Đã ẩn bình luận.")
                    }
                  >
                    Ẩn bình luận
                  </Button>
                )}
                {!review.removed && (
                  <Button
                    variant="danger"
                    onClick={() =>
                      moderate(review, review.commentHidden, true, "Đã gỡ đánh giá.")
                    }
                  >
                    Gỡ đánh giá
                  </Button>
                )}
                {(review.removed || review.commentHidden) && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      moderate(review, false, false, "Đã khôi phục đánh giá.")
                    }
                  >
                    Khôi phục
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pager page={paging.page} pageCount={paging.pageCount} total={paging.total} onPage={paging.setPage} />
    </Card>
  );
}
