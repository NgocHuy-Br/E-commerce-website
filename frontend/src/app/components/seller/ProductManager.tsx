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
import {
  defaultPromotionRange,
  formatCurrency,
  formatDateTime,
  toIsoInstant,
} from "../../lib/format";
import type { Category, Product, Promotion, Store } from "../../lib/types";
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

/** Đăng bán, sửa, ẩn/hiện sản phẩm và đăng khuyến mãi. */
export function ProductManager({ store }: { store: Store | null }) {
  const { token } = useSession();
  const notify = useNotify();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [form, setForm] = useState({ ...emptyProduct });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [promotingProduct, setPromotingProduct] = useState<Product | null>(
    null,
  );
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [productData, categoryData, promotionData] = await Promise.all([
        api<Product[]>("/api/products/mine", { token }),
        api<Category[]>("/api/products/categories"),
        api<Promotion[]>("/api/products/mine/promotions", { token }),
      ]);
      setProducts(productData);
      setCategories(categoryData);
      setPromotions(promotionData);
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

  const deletePromotion = async (promotionId: number) => {
    try {
      await api(`/api/products/promotions/${promotionId}`, {
        method: "DELETE",
        token,
      });
      notify("Đã xoá khuyến mãi.", "success");
      await load();
    } catch (error) {
      notify(errorMessage(error, "Không thể xoá khuyến mãi."), "error");
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
      <Card title={editingId ? "Cập nhật sản phẩm" : "Đăng bán sản phẩm"}>
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
          <Field label="Ảnh (URL)" error={errors.imageUrl}>
            <TextInput
              value={form.imageUrl}
              onChange={(value) => setForm({ ...form, imageUrl: value })}
              invalid={Boolean(errors.imageUrl)}
            />
          </Field>
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
          {editingId && (
            <Button
              variant="ghost"
              onClick={() => {
                setEditingId(null);
                setForm({ ...emptyProduct, categoryId: form.categoryId });
              }}
            >
              Huỷ
            </Button>
          )}
        </div>
      </Card>

      <Card
        title={`Sản phẩm của shop (${products.length})`}
        action={
          <Button variant="ghost" onClick={load}>
            Làm mới
          </Button>
        }
      >
        {products.length === 0 ? (
          <Empty>Chưa có sản phẩm nào.</Empty>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3 last:border-0"
              >
                <div className="text-sm">
                  <p className="font-medium">
                    {product.name}{" "}
                    <Badge
                      tone={
                        product.status === "ACTIVE"
                          ? "success"
                          : product.status === "HIDDEN"
                            ? "neutral"
                            : "warning"
                      }
                    >
                      {product.status}
                    </Badge>
                    {product.discountPercent > 0 && (
                      <Badge tone="danger">-{product.discountPercent}%</Badge>
                    )}
                    {product.hiddenByStore && (
                      <Badge tone="danger">Cửa hàng bị tạm ngưng</Badge>
                    )}
                  </p>
                  <p className="text-slate-600">
                    {formatCurrency(product.effectivePrice)} · tồn{" "}
                    {product.stockQuantity} · {product.categoryName}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingId(product.id);
                      setForm({
                        name: product.name,
                        description: product.description ?? "",
                        price: String(product.price),
                        stockQuantity: String(product.stockQuantity),
                        imageUrl: product.imageUrl ?? "",
                        categoryId: String(product.categoryId),
                      });
                    }}
                  >
                    Sửa
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setPromotingProduct(product)}
                  >
                    Khuyến mãi
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => toggleVisibility(product)}
                  >
                    {product.status === "HIDDEN" ? "Hiện" : "Ẩn"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title={`Khuyến mãi đang có (${promotions.length})`}>
        {promotions.length === 0 ? (
          <Empty>Chưa đăng khuyến mãi nào.</Empty>
        ) : (
          <ul className="space-y-2 text-sm">
            {promotions.map((promotion) => {
              const product = products.find(
                (item) => item.id === promotion.productId,
              );
              return (
                <li
                  key={promotion.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2 last:border-0"
                >
                  <span>
                    <b>{product?.name ?? `Sản phẩm #${promotion.productId}`}</b>{" "}
                    · giảm {promotion.discountPercent}% ·{" "}
                    {formatDateTime(promotion.startsAt)} →{" "}
                    {formatDateTime(promotion.endsAt)}
                  </span>
                  <Button
                    variant="danger"
                    onClick={() => deletePromotion(promotion.id)}
                  >
                    Xoá
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {promotingProduct && (
        <PromotionModal
          token={token}
          product={promotingProduct}
          onClose={() => setPromotingProduct(null)}
          onDone={async () => {
            setPromotingProduct(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function PromotionModal({
  token,
  product,
  onClose,
  onDone,
}: {
  token: string | null;
  product: Product;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const notify = useNotify();
  const range = defaultPromotionRange();
  const [discountPercent, setDiscountPercent] = useState("10");
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState(range.startsAt);
  const [endsAt, setEndsAt] = useState(range.endsAt);

  const submit = async () => {
    const problem = checkNumber(discountPercent, "Phần trăm giảm", {
      min: 1,
      max: 90,
    });
    setDiscountError(problem);
    if (problem) {
      return;
    }
    try {
      await api(`/api/products/${product.id}/promotions`, {
        method: "POST",
        token,
        body: {
          discountPercent: Number(discountPercent),
          startsAt: toIsoInstant(startsAt),
          endsAt: toIsoInstant(endsAt),
        },
      });
      notify(`Đã đăng khuyến mãi cho ${product.name}.`, "success");
      await onDone();
    } catch (error) {
      notify(errorMessage(error, "Không thể đăng khuyến mãi."), "error");
    }
  };

  return (
    <Modal title={`Khuyến mãi: ${product.name}`} onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Giảm (%) 1-90" error={discountError}>
          <TextInput
            type="number"
            value={discountPercent}
            onChange={setDiscountPercent}
            digitsOnly
            invalid={Boolean(discountError)}
          />
        </Field>
        <Field label="Bắt đầu">
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            className="w-full border border-stone-300 bg-white px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Kết thúc">
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className="w-full border border-stone-300 bg-white px-3 py-2 text-sm"
          />
        </Field>
      </div>
      <p className="mt-3 text-sm text-slate-600">
        Giá gốc {formatCurrency(product.price)} → giá sau giảm{" "}
        {formatCurrency(
          Math.round(
            (product.price * (100 - Number(discountPercent || 0))) / 100,
          ),
        )}
      </p>
      <Button className="mt-4" onClick={submit}>
        Đăng khuyến mãi
      </Button>
    </Modal>
  );
}
