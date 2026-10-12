"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { ProductCard } from "../../components/buyer/ProductCard";
import { Pager, usePaging } from "../../components/Pager";
import { Stars } from "../../components/Stars";
import { Card, Empty, StatTile } from "../../components/ui";
import { api } from "../../lib/api";
import { useCart } from "../../lib/cart";
import { useLoadEffect } from "../../lib/hooks";
import { useSession } from "../../lib/session";
import type { Product, ReviewSummary, Store } from "../../lib/types";

/** Trang cửa hàng công khai: thông tin shop và sản phẩm đang bán. */
export default function StorePage() {
  const params = useParams<{ storeId: string }>();
  const storeId = Number(params.storeId);
  const { token, isAdmin } = useSession();
  const { addItem } = useCart();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [ratings, setRatings] = useState<Record<number, ReviewSummary>>({});
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  const load = useCallback(async () => {
    const storeData = await api<Store>(`/api/stores/${storeId}`).catch(() => null);
    if (!storeData) {
      setState("missing");
      return;
    }
    const all = await api<Product[]>("/api/products").catch(() => [] as Product[]);
    const mine = all.filter((product) => product.storeId === storeId);
    const summaries = mine.length
      ? await api<ReviewSummary[]>(
          `/api/orders/reviews/summary?productIds=${mine.map((item) => item.id).join(",")}`,
        ).catch(() => [] as ReviewSummary[])
      : [];
    setStore(storeData);
    setProducts(mine);
    setRatings(Object.fromEntries(summaries.map((summary) => [summary.productId, summary])));
    setState("ready");
  }, [storeId]);

  useLoadEffect(load);
  const paging = usePaging(products, 12);

  if (state === "loading") {
    return <Card>Đang tải cửa hàng...</Card>;
  }
  if (state === "missing" || !store) {
    return (
      <Card>
        <Empty>Không tìm thấy cửa hàng này hoặc cửa hàng đang tạm ngưng.</Empty>
        <Link href="/" className="text-sm text-teal-800 hover:underline">
          ← Về trang chủ
        </Link>
      </Card>
    );
  }

  const reviewCount = Object.values(ratings).reduce((total, item) => total + item.reviewCount, 0);
  const weighted = Object.values(ratings).reduce((total, item) => total + item.averageRating * item.reviewCount, 0);
  const average = reviewCount === 0 ? 0 : weighted / reviewCount;

  return (
    <div className="space-y-5">
      <Card className="border-t-4 border-t-teal-700">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden border border-stone-200 bg-stone-100 text-xs text-slate-400">
            {store.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" />
            ) : (
              "Chưa có logo"
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold">{store.name}</h1>
            <p className="mt-1 text-sm text-slate-600">{store.description || "Cửa hàng chưa có giới thiệu."}</p>
            <p className="mt-2 text-xs text-slate-500">
              {store.address} · {store.phoneNumber}
            </p>
            <div className="mt-2">
              <Stars rating={average} count={reviewCount} />
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatTile label="Sản phẩm đang bán" value={products.length} />
          <StatTile label="Lượt đánh giá" value={reviewCount} />
          <StatTile label="Điểm trung bình" value={reviewCount ? average.toFixed(1) : "-"} />
        </div>
      </Card>

      {products.length === 0 ? (
        <Card>
          <Empty>Cửa hàng chưa có sản phẩm nào đang bán.</Empty>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paging.slice.map((product) => (
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
      <Pager page={paging.page} pageCount={paging.pageCount} total={paging.total} onPage={paging.setPage} />
    </div>
  );
}
