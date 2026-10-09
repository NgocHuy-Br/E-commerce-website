"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useLoadEffect } from "../../lib/hooks";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";
import {
  checkImageUrl,
  checkNumber,
  checkText,
  firstError,
} from "../../lib/validate";
import { formatCurrency } from "../../lib/format";
import type { Category, Product, ReviewSummary, Store } from "../../lib/types";
import { Stars } from "../Stars";
import { ImageUpload } from "../ImageUpload";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Modal,
  Select,
  TextArea,
  TextInput,
} from "../ui";

const emptyProduct = {
  name: "",
  description: "",
  price: "",
  stockQuantity: "",
  imageUrl: "",
  categoryId: "",
};

/** Đăng bán, sửa và ẩn/hiện sản phẩm của shop. */
export function ProductManager({
  store,
  onPromotion,
}: {
  store: Store | null;
  onPromotion: (productId: number) => void;
}) {
  const { token } = useSession();
  const notify = useNotify();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ ...emptyProduct });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [ratings, setRatings] = useState<Record<number, ReviewSummary>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [productData, categoryData] = await Promise.all([
        api<Product[]>("/api/products/mine", { token }),
        api<Category[]>("/api/products/categories"),
      ]);
      setProducts(productData);
      setCategories(categoryData);
      const ratingData = await api<ReviewSummary[]>(
        `/api/orders/reviews/summary?productIds=${productData.map((item) => item.id).join(",")}`,
      ).catch(() => [] as ReviewSummary[]);
      setRatings(Object.fromEntries(ratingData.map((rating) => [rating.productId, rating])));
      setForm((current) => ({
        ...current,
        categoryId:
          current.categoryId ||
          (categoryData[0] ? String(categoryData[0].id) : ""),
      }));
    } catch (error) {
      notify(errorMessage(error, "Không thể tải sản phẩm của shop."), "error");
    }
  }, [token, notify]);

  useLoadEffect(load);

  const visibleProducts = products
    .filter((product) => product.name.toLocaleLowerCase().includes(keyword.trim().toLocaleLowerCase()))
    .filter((product) => !categoryFilter || String(product.categoryId) === categoryFilter)
    .filter((product) => !statusFilter || product.status === statusFilter)
    .sort((left, right) => {
      if (sortBy === "price_asc") return left.effectivePrice - right.effectivePrice;
      if (sortBy === "price_desc") return right.effectivePrice - left.effectivePrice;
      if (sortBy === "stock_desc") return right.stockQuantity - left.stockQuantity;
      if (sortBy === "name") return left.name.localeCompare(right.name, "vi");
      return right.id - left.id;
    });

  const submit = async () => {
    const problems = {
      name: checkText(form.name, "Tên sản phẩm"),
      price: checkNumber(form.price, "Giá", { min: 1, max: 999999999 }),
      stockQuantity: checkNumber(form.stockQuantity, "Tồn kho", {
        min: 0,
        max: 100000,
      }),
      imageUrl: checkImageUrl(form.imageUrl),
    };
    setErrors(problems);
    if (firstError(problems)) {
      return;
    }
    if (!store) {
      notify("Bạn cần có cửa hàng đã được duyệt.", "error");
      return;
    }
    try {
      const body = {
        storeId: store.id,
        categoryId: Number(form.categoryId),
        name: form.name,
        description: form.description || null,
        price: Number(form.price),
        stockQuantity: Number(form.stockQuantity),
        imageUrl: form.imageUrl || null,
      };
      await api<Product>(
        editingId ? `/api/products/${editingId}` : "/api/products",
        {
          method: editingId ? "PUT" : "POST",
          token,
          body,
        },
      );
      notify(
        editingId ? "Đã cập nhật sản phẩm." : "Đã đăng bán sản phẩm.",
        "success",
      );
      setForm({ ...emptyProduct, categoryId: form.categoryId });
      setEditingId(null);
      setFormOpen(false);
      await load();
    } catch (error) {
      notify(errorMessage(error, "Không thể lưu sản phẩm."), "error");
    }
  };

  const toggleVisibility = async (product: Product) => {
    try {
      await api(
        `/api/products/${product.id}/visibility?visible=${product.status === "HIDDEN"}`,
        {
          method: "PUT",
          token,
        },
      );
      notify(
        product.status === "HIDDEN" ? "Đã hiện sản phẩm." : "Đã ẩn sản phẩm.",
        "success",
      );
      await load();
    } catch (error) {
      notify(
        errorMessage(error, "Không thể đổi trạng thái sản phẩm."),
        "error",
      );
    }
  };

  if (!store || store.status !== "ACTIVE") {
    return (
      <Card title="Đăng bán">
        <Empty>
          Cửa hàng cần được admin duyệt (ACTIVE) trước khi đăng bán.
        </Empty>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card
        title={`Sản phẩm của shop (${visibleProducts.length}/${products.length})`}
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={load}>Làm mới</Button>
            <Button onClick={() => {
              setEditingId(null);
              setForm({ ...emptyProduct, categoryId: categories[0] ? String(categories[0].id) : "" });
              setFormOpen(true);
            }}>Đăng sản phẩm</Button>
          </div>
        }
        className="border-t-4 border-t-amber-500"
      >
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Tìm sản phẩm">
            <TextInput value={keyword} onChange={setKeyword} placeholder="Nhập tên sản phẩm" />
          </Field>
          <Field label="Danh mục">
            <Select value={categoryFilter} onChange={setCategoryFilter} options={[
              { value: "", label: "Tất cả danh mục" },
              ...categories.map((category) => ({ value: String(category.id), label: category.name })),
            ]} />
          </Field>
          <Field label="Trạng thái">
            <Select value={statusFilter} onChange={setStatusFilter} options={[
              { value: "", label: "Tất cả trạng thái" },
              { value: "ACTIVE", label: "Đang bán" },
              { value: "HIDDEN", label: "Đang ẩn" },
              { value: "OUT_OF_STOCK", label: "Hết hàng" },
            ]} />
          </Field>
          <Field label="Sắp xếp">
            <Select value={sortBy} onChange={setSortBy} options={[
              { value: "newest", label: "Mới cập nhật" },
              { value: "price_asc", label: "Giá thấp đến cao" },
              { value: "price_desc", label: "Giá cao đến thấp" },
              { value: "stock_desc", label: "Tồn kho nhiều nhất" },
              { value: "name", label: "Tên A-Z" },
            ]} />
          </Field>
        </div>
        {visibleProducts.length === 0 ? (
          <Empty>Không tìm thấy sản phẩm phù hợp.</Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleProducts.map((product) => {
              const rating = ratings[product.id];
              return (
                <article key={product.id} className="flex flex-col border border-stone-200 bg-white p-3 transition hover:border-teal-700">
                  <div className="flex aspect-square items-center justify-center overflow-hidden bg-stone-100 text-sm text-slate-400">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                    ) : "Chưa có ảnh"}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1">
                    <Badge tone={product.status === "ACTIVE" ? "success" : product.status === "HIDDEN" ? "neutral" : "warning"}>
                      {product.status === "ACTIVE" ? "Đang bán" : product.status === "HIDDEN" ? "Đang ẩn" : "Hết hàng"}
                    </Badge>
                    {product.discountPercent > 0 && <Badge tone="danger">-{product.discountPercent}%</Badge>}
                    {product.hiddenByStore && <Badge tone="danger">Shop tạm ngưng</Badge>}
                  </div>
                  <h3 className="mt-2 font-semibold text-slate-900">{product.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{product.categoryName}</p>
                  <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-600">{product.description || "Chưa có mô tả"}</p>
                  <div className="mt-2"><Stars rating={rating?.averageRating ?? 0} count={rating?.reviewCount ?? 0} /></div>
                  <p className="mt-2 font-semibold text-teal-800">
                    {formatCurrency(product.effectivePrice)}
                    {product.discountPercent > 0 && <span className="ml-2 text-xs font-normal text-slate-400 line-through">{formatCurrency(product.price)}</span>}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Tồn kho: {product.stockQuantity}</p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    <Button className="flex-1" variant="ghost" onClick={() => {
                      setEditingId(product.id);
                      setForm({ name: product.name, description: product.description ?? "", price: String(product.price), stockQuantity: String(product.stockQuantity), imageUrl: product.imageUrl ?? "", categoryId: String(product.categoryId) });
                      setFormOpen(true);
                    }}>Chỉnh sửa</Button>
                    <Button className="flex-1" variant="secondary" onClick={() => onPromotion(product.id)}>Khuyến mãi</Button>
                    <Button variant="ghost" onClick={() => toggleVisibility(product)}>{product.status === "HIDDEN" ? "Hiện" : "Ẩn"}</Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>

      {formOpen && <Modal title={editingId ? "Cập nhật sản phẩm" : "Đăng sản phẩm mới"} onClose={() => setFormOpen(false)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tên sản phẩm" error={errors.name}>
            <TextInput
              value={form.name}
              onChange={(value) => setForm({ ...form, name: value })}
              invalid={Boolean(errors.name)}
            />
          </Field>
          <Field label="Danh mục">
            <Select
              value={form.categoryId}
              onChange={(value) => setForm({ ...form, categoryId: value })}
              options={categories.map((category) => ({
                value: String(category.id),
                label: category.name,
              }))}
            />
          </Field>
          <Field label="Giá (đ)" error={errors.price}>
            <TextInput
              type="number"
              value={form.price}
              onChange={(value) => setForm({ ...form, price: value })}
              digitsOnly
              invalid={Boolean(errors.price)}
            />
          </Field>
          <Field label="Tồn kho" error={errors.stockQuantity}>
            <TextInput
              type="number"
              value={form.stockQuantity}
              onChange={(value) => setForm({ ...form, stockQuantity: value })}
              digitsOnly
              invalid={Boolean(errors.stockQuantity)}
            />
          </Field>
        </div>
        <div className="mt-3">
          <ImageUpload label="Ảnh sản phẩm" value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} />
        </div>
        <div className="mt-3">
          <Field label="Mô tả">
            <TextArea
              value={form.description}
              onChange={(value) => setForm({ ...form, description: value })}
            />
          </Field>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={submit}>
            {editingId ? "Lưu thay đổi" : "Đăng bán"}
          </Button>
          <Button variant="ghost" onClick={() => {
            setEditingId(null);
            setForm({ ...emptyProduct, categoryId: form.categoryId });
            setFormOpen(false);
          }}>Huỷ</Button>
        </div>
      </Modal>}

    </div>
  );
}
