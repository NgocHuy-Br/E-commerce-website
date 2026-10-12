"use client";

import Link from "next/link";
import { formatCurrency } from "../../lib/format";
import { soldCountForProduct } from "../../lib/sales";
import { useWishlist } from "../../lib/wishlist";
import type { Product, ReviewSummary } from "../../lib/types";
import { Stars } from "../Stars";
import { Badge, Button } from "../ui";

/** Thẻ sản phẩm dùng chung cho trang chủ, trang cửa hàng và danh sách yêu thích. */
export function ProductCard({
  product,
  rating,
  isAdmin,
  loggedIn,
  onAdd,
}: {
  product: Product;
  rating?: ReviewSummary;
  isAdmin: boolean;
  loggedIn: boolean;
  onAdd: (product: Product) => void;
}) {
  const wishlist = useWishlist();
  const liked = wishlist.has(product.id);

  return (
    <article className="flex flex-col border border-stone-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="relative">
        <Link
          href={`/products/${product.id}`}
          className="flex aspect-square items-center justify-center overflow-hidden bg-stone-100 text-sm text-slate-400"
        >
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            "Chưa có ảnh"
          )}
        </Link>
        {!isAdmin && (
          <button
            type="button"
            onClick={() => wishlist.toggle(product.id)}
            aria-pressed={liked}
            aria-label={liked ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"}
            className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border bg-white text-lg shadow-sm ${
              liked ? "border-rose-300 text-rose-500" : "border-stone-300 text-slate-400 hover:text-rose-500"
            }`}
          >
            {liked ? "♥" : "♡"}
          </button>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <Link href={`/products/${product.id}`} className="font-semibold hover:text-teal-800">
          {product.name}
        </Link>
        {product.discountPercent > 0 && <Badge tone="danger">-{product.discountPercent}%</Badge>}
      </div>
      <p className="mt-1 text-xs text-slate-500">{product.categoryName}</p>
      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{product.description || "Chưa có mô tả"}</p>
      <div className="mt-2">
        <Stars rating={rating?.averageRating ?? 0} count={rating?.reviewCount ?? 0} />
      </div>
      <p className="mt-2 font-semibold text-teal-800">
        {formatCurrency(product.effectivePrice)}
        {product.discountPercent > 0 && (
          <span className="ml-2 text-xs font-normal text-slate-400 line-through">
            {formatCurrency(product.price)}
          </span>
        )}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Còn {product.stockQuantity} sản phẩm · Đã bán {product.soldQuantity ?? soldCountForProduct(product.id)}
      </p>
      <div className="mt-3 flex gap-2">
        {!isAdmin && (
          <Button className="flex-1" disabled={product.stockQuantity < 1} onClick={() => onAdd(product)}>
            {product.stockQuantity < 1 ? "Hết hàng" : "Thêm vào giỏ"}
          </Button>
        )}
        <Link
          href={`/products/${product.id}`}
          className={`border border-stone-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-stone-100 ${
            isAdmin ? "flex-1" : ""
          }`}
        >
          Chi tiết
        </Link>
      </div>
      {!loggedIn && <p className="mt-2 text-xs text-slate-400">Cần đăng nhập để mua hàng.</p>}
      {isAdmin && <p className="mt-2 text-xs text-slate-400">Tài khoản quản trị chỉ xem, không mua hàng.</p>}
    </article>
  );
}
