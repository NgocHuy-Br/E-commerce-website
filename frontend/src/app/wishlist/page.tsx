"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ProductCard } from "../components/buyer/ProductCard";
import { Card, Empty, PageHeader } from "../components/ui";
import { api } from "../lib/api";
import { useCart } from "../lib/cart";
import { useLoadEffect } from "../lib/hooks";
import { useSession } from "../lib/session";
import type { Product, ReviewSummary } from "../lib/types";
import { useWishlist } from "../lib/wishlist";

/** Danh sách sản phẩm yêu thích của tài khoản đang đăng nhập. */
export default function WishlistPage() {
  const { token, isAdmin } = useSession();
  const { addItem } = useCart();
  const wishlist = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [ratings, setRatings] = useState<Record<number, ReviewSummary>>({});
  const [loaded, setLoaded] = useState(false);
  const idsKey = wishlist.ids.join(",");

  const load = useCallback(async () => {
    const ids = idsKey ? idsKey.split(",").map(Number) : [];
    const items = (
      await Promise.all(ids.map((id) => api<Product>(`/api/products/${id}`).catch(() => null)))
    ).filter((item): item is Product => item !== null);
    const summaries = items.length
      ? await api<ReviewSummary[]>(
          `/api/orders/reviews/summary?productIds=${items.map((item) => item.id).join(",")}`,
        ).catch(() => [] as ReviewSummary[])
      : [];
    setProducts(items);
    setRatings(Object.fromEntries(summaries.map((summary) => [summary.productId, summary])));
    setLoaded(true);
  }, [idsKey]);

  useLoadEffect(load);

  return (
    <>
      <PageHeader title="Sản phẩm yêu thích" back={false} />
      {!loaded ? (
        <Card>Đang tải...</Card>
      ) : products.length === 0 ? (
        <Card>
          <Empty>Bạn chưa thêm sản phẩm yêu thích nào. Bấm biểu tượng trái tim trên sản phẩm để lưu lại.</Empty>
          <Link href="/" className="text-sm text-teal-800 hover:underline">
            Tiếp tục mua sắm
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              rating={ratings[product.id]}
              isAdmin={isAdmin}
              loggedIn={Boolean(token)}
              onAdd={(item) => addItem(item, 1)}
            />
          ))}
        </div>
      )}
    </>
  );
}
