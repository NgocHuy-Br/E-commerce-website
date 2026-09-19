"use client";

import { useCallback, useState } from "react";
import { api } from "../../lib/api";
import { useLoadEffect } from "../../lib/hooks";
import { formatCurrency, formatDateTime } from "../../lib/format";
import type { Notify } from "../../lib/session";
import type { Product, Promotion, Review } from "../../lib/types";
import { Stars } from "../Stars";
import { Badge, Button, Empty, Modal } from "../ui";

/** Chi tiết sản phẩm kèm khuyến mãi đang chạy và các đánh giá đã có. */
export function ProductDetailModal({
  product,
  token,
  onClose,
  onAddToCart,
  notify,
}: {
  product: Product;
  token: string | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => Promise<void>;
  notify: Notify;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [quantity, setQuantity] = useState(1);

  const load = useCallback(async () => {
    const [reviewData, promotionData] = await Promise.all([
      api<Review[]>(`/api/orders/reviews?productId=${product.id}`).catch(
        () => [] as Review[],
      ),
      api<Promotion[]>(`/api/products/${product.id}/promotions`).catch(
        () => [] as Promotion[],
      ),
    ]);
    setReviews(reviewData);
    setPromotions(promotionData);
  }, [product.id]);

  useLoadEffect(load);

  const average =
    reviews.length === 0
      ? 0
      : reviews.reduce((total, review) => total + review.rating, 0) /
        reviews.length;

  return (
    <Modal title={product.name} onClose={onClose}>
      <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
        <div className="flex aspect-square items-center justify-center overflow-hidden bg-stone-100 text-sm text-slate-400">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            "Chưa có ảnh"
          )}
        </div>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            {product.description || "Chưa có mô tả"}
          </p>
          <p className="text-xs text-slate-500">
            Danh mục: {product.categoryName} · Còn {product.stockQuantity} sản
            phẩm
          </p>
          <p className="text-lg font-semibold text-teal-800">
            {formatCurrency(product.effectivePrice)}
            {product.discountPercent > 0 && (
              <>
                <span className="ml-2 text-sm font-normal text-slate-400 line-through">
                  {formatCurrency(product.price)}
                </span>
                <Badge tone="danger">-{product.discountPercent}%</Badge>
              </>
            )}
          </p>
          <Stars rating={average} count={reviews.length} />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="px-2 py-1"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              -
            </Button>
            <span className="w-8 text-center text-sm">{quantity}</span>
            <Button
              variant="ghost"
              className="px-2 py-1"
              disabled={quantity >= product.stockQuantity}
              onClick={() => setQuantity(quantity + 1)}
            >
              +
            </Button>
            <Button
              disabled={!token || product.stockQuantity < 1}
              onClick={async () => {
                await onAddToCart(product, quantity);
                notify(
                  `Đã thêm ${quantity} x ${product.name} vào giỏ.`,
                  "success",
                );
              }}
            >
              {token ? "Thêm vào giỏ" : "Đăng nhập để mua"}
            </Button>
          </div>
        </div>
      </div>

      {promotions.length > 0 && (
        <div className="mt-5 border-t border-stone-200 pt-4">
          <h3 className="text-sm font-semibold">Chương trình khuyến mãi</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {promotions.map((promotion) => (
              <li key={promotion.id}>
                Giảm {promotion.discountPercent}% ·{" "}
                {formatDateTime(promotion.startsAt)} →{" "}
                {formatDateTime(promotion.endsAt)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 border-t border-stone-200 pt-4">
        <h3 className="text-sm font-semibold">Đánh giá của người mua</h3>
        {reviews.length === 0 ? (
          <Empty>Chưa có đánh giá nào cho sản phẩm này.</Empty>
        ) : (
          <ul className="mt-2 space-y-3">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="border-b border-stone-100 pb-2 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <Stars rating={review.rating} />
                  <span className="text-xs text-slate-400">
                    {formatDateTime(review.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {review.comment || "(không có nhận xét)"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
