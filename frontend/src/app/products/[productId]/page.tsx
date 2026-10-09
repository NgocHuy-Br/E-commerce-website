"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Stars } from "../../components/Stars";
import {
  Badge,
  BackButton,
  Button,
  Card,
  Empty,
  Field,
  TextArea,
} from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { useCart } from "../../lib/cart";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { useLoadEffect } from "../../lib/hooks";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";
import type { Order, Product, Promotion, Review } from "../../lib/types";

/** Trang chi tiết sản phẩm: thông tin, khuyến mãi, đánh giá và bình luận. */
export default function ProductDetailPage() {
  const params = useParams<{ productId: string }>();
  const productId = Number(params.productId);
  const { token, hasRole, isAdmin } = useSession();
  const notify = useNotify();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewableOrders, setReviewableOrders] = useState<Order[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    const [productData, promotionData, reviewData, orderData] =
      await Promise.all([
        api<Product>(`/api/products/${productId}`).catch(() => null),
        api<Promotion[]>(`/api/products/${productId}/promotions`).catch(
          () => [] as Promotion[],
        ),
        api<Review[]>(`/api/orders/reviews?productId=${productId}`).catch(
          () => [] as Review[],
        ),
        token
          ? api<Order[]>("/api/orders/mine", { token }).catch(
              () => [] as Order[],
            )
          : Promise.resolve([] as Order[]),
      ]);
    setProduct(productData);
    setNotFound(productData === null);
    // Chỉ giữ khuyến mãi chưa hết hạn, tính lúc nạp dữ liệu để phần render luôn thuần khiết.
    const now = Date.now();
    setPromotions(
      promotionData.filter(
        (promotion) => !promotion.cancelled && new Date(promotion.endsAt).getTime() > now,
      ),
    );
    setReviews(reviewData);
    // Đơn đã nhận hàng và chưa đánh giá sản phẩm này thì cho phép viết đánh giá.
    setReviewableOrders(
      orderData.filter(
        (order) =>
          order.status === "DELIVERED" &&
          order.items.some(
            (item) => item.productId === productId && !item.reviewed,
          ),
      ),
    );
  }, [productId, token]);

  useLoadEffect(load);

  if (notFound) {
    return (
      <>
        <div className="mb-4">
          <BackButton />
        </div>
        <Card>
          <Empty>Không tìm thấy sản phẩm này.</Empty>
          <Link href="/" className="text-sm text-teal-800 hover:underline">
            ← Về trang chủ
          </Link>
        </Card>
      </>
    );
  }

  if (!product) {
    return <Card>Đang tải sản phẩm...</Card>;
  }

  const average =
    reviews.length === 0
      ? 0
      : reviews.reduce((total, review) => total + review.rating, 0) /
        reviews.length;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <BackButton />
        <span>·</span>
        <Link href="/" className="hover:text-teal-800">
          Trang chủ
        </Link>
        <span>/</span>
        <span>{product.categoryName}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <div className="grid gap-6 sm:grid-cols-[260px_1fr]">
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
              <h1 className="text-xl font-semibold">{product.name}</h1>
              <Stars rating={average} count={reviews.length} />
              <p className="text-2xl font-semibold text-teal-800">
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
              <p className="text-sm text-slate-500">
                Danh mục {product.categoryName} · còn {product.stockQuantity}{" "}
                sản phẩm · shop #{product.storeId}
              </p>
              <p className="whitespace-pre-line text-sm text-slate-700">
                {product.description || "Chưa có mô tả"}
              </p>
            </div>
          </div>

          {promotions.length > 0 && (
            <div className="mt-5 border-t border-stone-200 pt-4">
              <h2 className="text-sm font-semibold">Khuyến mãi đang áp dụng</h2>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {promotions.map((promotion) => (
                  <li key={promotion.id}>
                    Giảm {promotion.discountPercent}% · đến{" "}
                    {formatDateTime(promotion.endsAt)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {isAdmin ? (
          <Card title="Tài khoản quản trị">
            <p className="text-sm text-slate-600">
              Quản trị viên chỉ xem thông tin sản phẩm, không thực hiện mua
              hàng.
            </p>
            <Link
              href="/admin"
              className="mt-3 inline-block bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800"
            >
              Về khu quản trị
            </Link>
          </Card>
        ) : (
          <Card title="Mua hàng">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="px-3 py-1"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                -
              </Button>
              <span className="w-10 text-center">{quantity}</span>
              <Button
                variant="ghost"
                className="px-3 py-1"
                disabled={quantity >= product.stockQuantity}
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </Button>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Tạm tính:{" "}
              <b>{formatCurrency(product.effectivePrice * quantity)}</b>
            </p>
            <Button
              className="mt-4 w-full"
              disabled={
                product.stockQuantity < 1 || product.status !== "ACTIVE"
              }
              onClick={() => addItem(product, quantity)}
            >
              {product.stockQuantity < 1 ? "Hết hàng" : "Thêm vào giỏ hàng"}
            </Button>
            <Link
              href="/cart"
              className="mt-2 block border border-teal-700 px-3 py-2 text-center text-sm font-medium text-teal-800 hover:bg-teal-50"
            >
              Xem giỏ hàng
            </Link>
            {!token && (
              <p className="mt-3 text-xs text-slate-500">
                <Link
                  href={`/login?next=${encodeURIComponent(`/products/${productId}`)}`}
                  className="text-teal-800 hover:underline"
                >
                  Đăng nhập
                </Link>{" "}
                để thêm sản phẩm vào giỏ hàng.
              </p>
            )}
          </Card>
        )}
      </div>

      <div className="mt-5">
        <Card title={`Đánh giá & bình luận (${reviews.length})`}>
          {token && hasRole("BUYER") && reviewableOrders.length > 0 && (
            <ReviewForm
              orderId={reviewableOrders[0].id}
              productId={productId}
              onDone={load}
              notify={notify}
              token={token}
            />
          )}

          {reviews.length === 0 ? (
            <Empty>
              Chưa có đánh giá nào. Hãy là người đầu tiên nhận xét sản phẩm này.
            </Empty>
          ) : (
            <ul className="divide-y divide-stone-100">
              {reviews.map((review) => (
                <li key={review.id} className="py-3 first:pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars rating={review.rating} />
                    <span className="text-sm font-medium">
                      Khách đã mua hàng
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDateTime(review.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">
                    {review.comment || "(không có nhận xét)"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function ReviewForm({
  orderId,
  productId,
  token,
  onDone,
  notify,
}: {
  orderId: number;
  productId: number;
  token: string;
  onDone: () => Promise<void>;
  notify: (message: string, tone?: "info" | "success" | "error") => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setSending(true);
    try {
      await api(`/api/orders/${orderId}/reviews`, {
        method: "POST",
        token,
        body: { productId, rating, comment },
      });
      setComment("");
      notify("Cảm ơn bạn đã đánh giá.", "success");
      await onDone();
    } catch (error) {
      notify(errorMessage(error, "Không thể gửi đánh giá."), "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mb-5 border border-stone-200 bg-stone-50 p-4">
      <p className="text-sm font-medium">
        Bạn đã mua sản phẩm này — viết đánh giá của bạn
      </p>
      <div className="mt-3 space-y-3">
        <Field label="Số sao">
          <Stars rating={rating} onSelect={setRating} />
        </Field>
        <Field label="Bình luận">
          <TextArea
            value={comment}
            onChange={setComment}
            placeholder="Chia sẻ cảm nhận của bạn..."
          />
        </Field>
        <Button onClick={submit} disabled={sending}>
          {sending ? "Đang gửi..." : "Gửi đánh giá"}
        </Button>
      </div>
    </div>
  );
}
