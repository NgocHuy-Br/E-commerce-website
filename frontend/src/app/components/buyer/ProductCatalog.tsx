"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { api, errorMessage, query } from "../../lib/api";
import { useCart } from "../../lib/cart";
import { formatCurrency } from "../../lib/format";
import { useLoadEffect } from "../../lib/hooks";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";
import type { Category, PageResponse, Product, ReviewSummary } from "../../lib/types";
import { Stars } from "../Stars";
import { Badge, Button, Card, Empty, Field, Select, TextInput } from "../ui";

const PAGE_SIZE = 12;

/** Tìm kiếm hàng hoá ở trang chủ: từ khoá, danh mục, khoảng giá, sắp xếp, phân trang. */
export function ProductCatalog() {
  const { token, isAdmin } = useSession();
  const notify = useNotify();
  const { addItem } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Điều kiện tìm kiếm lấy từ URL nên bấm quay lại hoặc chia sẻ link vẫn giữ nguyên kết quả.
  const keywordParam = searchParams.get("keyword") ?? "";
  const categoryParam = searchParams.get("categoryId") ?? "";
  const minPriceParam = searchParams.get("minPrice") ?? "";
  const maxPriceParam = searchParams.get("maxPrice") ?? "";
  const sortParam = searchParams.get("sort") ?? "newest";
  const pageParam = Number(searchParams.get("page") ?? "0") || 0;

  const [keyword, setKeyword] = useState(keywordParam);
  const [categoryId, setCategoryId] = useState(categoryParam);
  const [minPrice, setMinPrice] = useState(minPriceParam);
  const [maxPrice, setMaxPrice] = useState(maxPriceParam);
  const [sort, setSort] = useState(sortParam);

  const [page, setPage] = useState<PageResponse<Product> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ratings, setRatings] = useState<Record<number, ReviewSummary>>({});
  const [loading, setLoading] = useState(false);

  const loadRatings = useCallback(async (items: Product[]) => {
    if (items.length === 0) {
      return;
    }
    const summaries = await api<ReviewSummary[]>(
      `/api/orders/reviews/summary?productIds=${items.map((item) => item.id).join(",")}`,
    ).catch(() => [] as ReviewSummary[]);
    setRatings(Object.fromEntries(summaries.map((summary) => [summary.productId, summary])));
  }, []);

  /** Nạp danh mục và trang sản phẩm theo đúng điều kiện đang có trên URL. */
  const load = useCallback(async () => {
    try {
      const [categoryData, pageData] = await Promise.all([
        api<Category[]>("/api/products/categories"),
        api<PageResponse<Product>>(
          `/api/products${query({
            keyword: keywordParam,
            categoryId: categoryParam,
            minPrice: minPriceParam,
            maxPrice: maxPriceParam,
            sort: sortParam,
            page: pageParam,
            size: PAGE_SIZE,
          })}`,
        ),
      ]);
      setCategories(categoryData);
      setPage(pageData);
      await loadRatings(pageData.items);
    } catch (error) {
      notify(errorMessage(error, "Không thể tải sản phẩm."), "error");
    }
  }, [
    keywordParam,
    categoryParam,
    minPriceParam,
    maxPriceParam,
    sortParam,
    pageParam,
    loadRatings,
    notify,
  ]);

  useLoadEffect(load);

  /** Ghi điều kiện tìm kiếm vào URL, việc nạp dữ liệu do useLoadEffect đảm nhiệm. */
  const applyFilters = (nextPage = 0) => {
    setLoading(true);
    router.replace(
      `${pathname}${query({
        keyword,
        categoryId,
        minPrice,
        maxPrice,
        sort: sort === "newest" ? "" : sort,
        page: nextPage === 0 ? "" : nextPage,
      })}`,
      { scroll: nextPage !== 0 },
    );
    setLoading(false);
  };

  const resetFilters = () => {
    setKeyword("");
    setCategoryId("");
    setMinPrice("");
    setMaxPrice("");
    setSort("newest");
    router.replace(pathname);
  };

  const products = page?.items ?? [];

  return (
    <div className="space-y-5">
      <Card title="Tìm kiếm hàng hoá">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Từ khoá">
            <TextInput
              value={keyword}
              onChange={setKeyword}
              placeholder="Tên sản phẩm"
              onEnter={() => applyFilters()}
            />
          </Field>
          <Field label="Danh mục">
            <Select
              value={categoryId}
              onChange={setCategoryId}
              options={[
                { value: "", label: "Tất cả danh mục" },
                ...categories.map((category) => ({
                  value: String(category.id),
                  label: category.name,
                })),
              ]}
            />
          </Field>
          <Field label="Sắp xếp">
            <Select
              value={sort}
              onChange={setSort}
              options={[
                { value: "newest", label: "Mới nhất" },
                { value: "price_asc", label: "Giá tăng dần" },
                { value: "price_desc", label: "Giá giảm dần" },
                { value: "name", label: "Tên A-Z" },
              ]}
            />
          </Field>
          <Field label="Giá từ">
            <TextInput type="number" value={minPrice} onChange={setMinPrice} placeholder="0" />
          </Field>
          <Field label="Giá đến">
            <TextInput type="number" value={maxPrice} onChange={setMaxPrice} placeholder="1000000" />
          </Field>
          <div className="flex items-end gap-2">
            <Button variant="accent" className="flex-1" onClick={() => applyFilters()} disabled={loading}>
              {loading ? "Đang tìm..." : "Tìm kiếm"}
            </Button>
            <Button variant="ghost" onClick={resetFilters}>
              Bỏ lọc
            </Button>
          </div>
        </div>
        {page && page.totalItems > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            Tìm thấy {page.totalItems} sản phẩm · trang {page.page + 1}/{page.totalPages}
          </p>
        )}
      </Card>

      {products.length === 0 ? (
        <Card>
          <Empty>Không tìm thấy sản phẩm phù hợp.</Empty>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const rating = ratings[product.id];
              return (
                <article
                  key={product.id}
                  className="flex flex-col border border-stone-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <Link
                    href={`/products/${product.id}`}
                    className="flex aspect-square items-center justify-center overflow-hidden bg-stone-100 text-sm text-slate-400"
                  >
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
                  </Link>
                  <div className="mt-3 flex items-start justify-between gap-2">
                    <Link
                      href={`/products/${product.id}`}
                      className="font-semibold hover:text-teal-800"
                    >
                      {product.name}
                    </Link>
                    {product.discountPercent > 0 && (
                      <Badge tone="danger">-{product.discountPercent}%</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{product.categoryName}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                    {product.description || "Chưa có mô tả"}
                  </p>
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
                  <p className="mt-1 text-xs text-slate-500">Còn {product.stockQuantity} sản phẩm</p>
                  <div className="mt-3 flex gap-2">
                    {!isAdmin && (
                      <Button
                        className="flex-1"
                        disabled={product.stockQuantity < 1}
                        onClick={() => addItem(product, 1)}
                      >
                        Thêm vào giỏ
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
                  {!token && <p className="mt-2 text-xs text-slate-400">Cần đăng nhập để mua hàng.</p>}
                  {isAdmin && (
                    <p className="mt-2 text-xs text-slate-400">
                      Tài khoản quản trị chỉ xem, không mua hàng.
                    </p>
                  )}
                </article>
              );
            })}
          </div>

          {page && page.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="ghost"
                disabled={page.page === 0}
                onClick={() => applyFilters(page.page - 1)}
              >
                ← Trang trước
              </Button>
              <span className="text-sm text-slate-600">
                Trang {page.page + 1} / {page.totalPages}
              </span>
              <Button variant="ghost" disabled={!page.hasNext} onClick={() => applyFilters(page.page + 1)}>
                Trang sau →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
