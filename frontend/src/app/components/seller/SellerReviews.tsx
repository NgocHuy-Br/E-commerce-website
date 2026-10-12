"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import { useLoadEffect } from "../../lib/hooks";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";
import type { SellerReview } from "../../lib/types";
import { Pager, usePaging } from "../Pager";
import { SellerReply } from "../ReviewReply";
import { Stars } from "../Stars";
import { Badge, Button, Card, Empty, Select, StatTile } from "../ui";

/** Tất cả đánh giá về sản phẩm của shop, gom một chỗ để phản hồi nhanh. */
export function SellerReviews() {
  const { token } = useSession();
  const notify = useNotify();
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [filter, setFilter] = useState("unanswered");

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setReviews(await api<SellerReview[]>("/api/orders/seller/reviews", { token }));
    } catch (error) {
      notify(errorMessage(error, "Không thể tải đánh giá của shop."), "error");
    }
  }, [token, notify]);

  useLoadEffect(load);

  const shown = reviews.filter((review) =>
    filter === "unanswered"
      ? !review.sellerReply
      : filter === "low"
        ? review.rating <= 3
        : true,
  );
  const paging = usePaging(shown, 8, filter);
  const average = reviews.length === 0 ? 0 : reviews.reduce((total, review) => total + review.rating, 0) / reviews.length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Tổng đánh giá" value={reviews.length} />
        <StatTile label="Điểm trung bình" value={reviews.length ? average.toFixed(1) : "-"} />
        <StatTile label="Chưa phản hồi" value={reviews.filter((review) => !review.sellerReply).length} />
      </div>
      <Card
        title="Đánh giá của khách"
        action={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={load}>
              Làm mới
            </Button>
            <div className="w-48">
              <Select
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "unanswered", label: "Chưa phản hồi" },
                  { value: "low", label: "3 sao trở xuống" },
                  { value: "all", label: "Tất cả" },
                ]}
              />
            </div>
          </div>
        }
      >
        {shown.length === 0 ? (
          <Empty>Không có đánh giá phù hợp.</Empty>
        ) : (
          <ul className="divide-y divide-stone-100">
            {paging.slice.map((review) => (
              <li key={review.id} className="py-3 first:pt-0">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Stars rating={review.rating} />
                  <Link href={`/products/${review.productId}`} className="text-teal-800 hover:underline">
                    {review.productName}
                  </Link>
                  <span className="text-xs text-slate-400">{formatDateTime(review.createdAt)}</span>
                  {review.commentHidden && <Badge tone="warning">Bình luận đã bị ẩn</Badge>}
                </div>
                <p className="mt-1 text-sm text-slate-700">
                  {review.commentHidden ? "Bình luận đã bị quản trị viên ẩn." : review.comment || "(không có nhận xét)"}
                </p>
                <SellerReply review={review} canReply token={token} onDone={load} notify={notify} />
              </li>
            ))}
          </ul>
        )}
        <Pager page={paging.page} pageCount={paging.pageCount} total={paging.total} onPage={paging.setPage} />
      </Card>
    </div>
  );
}
