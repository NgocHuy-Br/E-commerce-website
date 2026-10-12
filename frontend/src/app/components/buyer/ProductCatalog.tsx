"use client";

import { useCallback, useState } from "react";
import { api, errorMessage, query } from "../../lib/api";
import { useCart } from "../../lib/cart";
import { useLoadEffect } from "../../lib/hooks";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";
import type { Category, Product, ReviewSummary } from "../../lib/types";
import { Pager, usePaging } from "../Pager";
import { Button, Card, Empty, Field, Select, TextInput } from "../ui";
import { ProductCard } from "./ProductCard";

const SERVER_SORTS = ["newest", "price_asc", "price_desc", "name"];

/** Tìm kiếm hàng hoá ở trang chủ: từ khoá, danh mục, khoảng giá, khuyến mãi, sắp xếp. */
export function ProductCatalog() {
  const { token, isAdmin } = useSession();
  const notify = useNotify();
  const { addItem } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ratings, setRatings] = useState<Record<number, ReviewSummary>>({});
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("newest");
  const [onlyDiscount, setOnlyDiscount] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  /** Lấy điểm sao trung bình của các sản phẩm đang hiển thị. */
  const loadRatings = useCallback(async (items: Product[]) => {
    if (items.length === 0) {
      return;
    }
    const ids = items.map((item) => item.id).join(",");
    const summaries = await api<ReviewSummary[]>(`/api/orders/reviews/summary?productIds=${ids}`).catch(
      () => [] as ReviewSummary[],
    );
    setRatings(Object.fromEntries(summaries.map((summary) => [summary.productId, summary])));
  }, []);

  /** Nạp danh mục và danh sách sản phẩm khi mở trang. */
  const loadInitial = useCallback(async () => {
    try {
      const [categoryData, productData] = await Promise.all([
        api<Category[]>("/api/products/categories"),
        api<Product[]>("/api/products"),
      ]);
      setCategories(categoryData);
      setProducts(productData);
      await loadRatings(productData);
    } catch (error) {
      notify(errorMessage(error, "Không thể tải sản phẩm."), "error");
    }
  }, [loadRatings, notify]);

  useLoadEffect(loadInitial);

  const search = async (override?: { keyword?: string; categoryId?: string; minPrice?: string; maxPrice?: string; sort?: string }) => {
    const params = {
      keyword: override?.keyword ?? keyword,
      categoryId: override?.categoryId ?? categoryId,
      minPrice: override?.minPrice ?? minPrice,
      maxPrice: override?.maxPrice ?? maxPrice,
      sort: override?.sort ?? sort,
    };
    setLoading(true);
    try {
      const result = await api<Product[]>(
        `/api/products${query({
          ...params,
          sort: SERVER_SORTS.includes(params.sort) ? params.sort : "newest",
        })}`,
      );
      setProducts(result);
      await loadRatings(result);
    } catch (error) {
      notify(errorMessage(error, "Không thể tải sản phẩm."), "error");
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setKeyword("");
    setCategoryId("");
    setMinPrice("");
    setMaxPrice("");
    setSort("newest");
    setOnlyDiscount(false);
    setInStockOnly(false);
    void search({ keyword: "", categoryId: "", minPrice: "", maxPrice: "", sort: "newest" });
  };

  const visible = products
    .filter((product) => !onlyDiscount || product.discountPercent > 0)
    .filter((product) => !inStockOnly || product.stockQuantity > 0)
    .sort((left, right) => {
      if (sort === "popular") return (right.soldQuantity ?? 0) - (left.soldQuantity ?? 0);
      if (sort === "rating") {
        return (ratings[right.id]?.averageRating ?? 0) - (ratings[left.id]?.averageRating ?? 0);
      }
      return 0;
    });
  const paging = usePaging(
    visible,
    12,
    `${keyword}|${categoryId}|${minPrice}|${maxPrice}|${sort}|${onlyDiscount}|${inStockOnly}|${products.length}`,
  );

  return (
    <div className="space-y-5">
      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Từ khoá">
            <TextInput value={keyword} onChange={setKeyword} placeholder="Tên sản phẩm" onEnter={() => search()} />
          </Field>
          <Field label="Danh mục">
            <Select
              value={categoryId}
              onChange={(value) => {
                setCategoryId(value);
                void search({ categoryId: value });
              }}
              options={[
                { value: "", label: "Tất cả danh mục" },
                ...categories.map((category) => ({ value: String(category.id), label: category.name })),
              ]}
            />
          </Field>
          <Field label="Sắp xếp">
            <Select
              value={sort}
              onChange={(value) => {
                setSort(value);
                if (SERVER_SORTS.includes(value)) void search({ sort: value });
              }}
              options={[
                { value: "newest", label: "Mới nhất" },
                { value: "popular", label: "Bán chạy" },
                { value: "rating", label: "Đánh giá cao" },
                { value: "price_asc", label: "Giá tăng dần" },
                { value: "price_desc", label: "Giá giảm dần" },
                { value: "name", label: "Tên A-Z" },
              ]}
            />
          </Field>
          <Field label="Giá từ (đ)">
            <TextInput value={minPrice} onChange={setMinPrice} placeholder="0" thousands onEnter={() => search()} />
          </Field>
          <Field label="Giá đến (đ)">
            <TextInput value={maxPrice} onChange={setMaxPrice} placeholder="1.000.000" thousands onEnter={() => search()} />
          </Field>
          <div className="flex items-end gap-2">
            <Button variant="accent" className="flex-1" onClick={() => search()} disabled={loading}>
              {loading ? "Đang tìm..." : "Tìm kiếm"}
            </Button>
            <Button variant="ghost" onClick={clearFilters}>
              Xoá lọc
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={onlyDiscount} onChange={(event) => setOnlyDiscount(event.target.checked)} />
            Đang giảm giá
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)} />
            Còn hàng
          </label>
          <span className="text-xs text-slate-500">{visible.length} sản phẩm</span>
        </div>
      </Card>

      {visible.length === 0 ? (
        <Card>
          <Empty>Không tìm thấy sản phẩm phù hợp.</Empty>
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
