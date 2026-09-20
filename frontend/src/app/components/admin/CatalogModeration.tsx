"use client";

import { useCallback, useState } from "react";
import { api, errorMessage, query } from "../../lib/api";
import { useLoadEffect } from "../../lib/hooks";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";
import { formatCurrency } from "../../lib/format";
import type { Category, Product, ProductStatus } from "../../lib/types";
import { Badge, Button, Card, Empty, Field, Select, TextInput } from "../ui";

/** Quản lý danh mục và kiểm duyệt sản phẩm trên sàn. */
export function CatalogModeration() {
  const { token } = useSession();
  const notify = useNotify();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [categoryData, productData] = await Promise.all([
        api<Category[]>("/api/products/categories"),
        api<Product[]>(`/api/products/admin${query({ status })}`, { token }),
      ]);
      setCategories(categoryData);
      setProducts(productData);
    } catch (error) {
      notify(
        errorMessage(error, "Không thể tải dữ liệu danh mục/sản phẩm."),
        "error",
      );
    }
  }, [token, status, notify]);

  useLoadEffect(load);

  const saveCategory = async () => {
    try {
      await api<Category>(
        editingId
          ? `/api/products/categories/${editingId}`
          : "/api/products/categories",
        {
          method: editingId ? "PUT" : "POST",
          token,
          body: { name, description: description || null },
        },
      );
      notify(
        editingId ? "Đã cập nhật danh mục." : "Đã thêm danh mục.",
        "success",
      );
      setName("");
      setDescription("");
      setEditingId(null);
      await load();
    } catch (error) {
      notify(errorMessage(error, "Không thể lưu danh mục."), "error");
    }
  };

  const setProductStatus = async (product: Product, next: ProductStatus) => {
    try {
      await api(`/api/products/${product.id}/status?status=${next}`, {
        method: "PUT",
        token,
      });
      notify(`Sản phẩm ${product.name} → ${next}.`, "success");
      await load();
    } catch (error) {
      notify(errorMessage(error, "Không thể cập nhật sản phẩm."), "error");
    }
  };

  return (
    <div className="space-y-5">
      <Card title={`Danh mục hàng hoá (${categories.length})`}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tên danh mục">
            <TextInput
              value={name}
              onChange={setName}
              placeholder="Đồ điện tử"
            />
          </Field>
          <Field label="Mô tả">
            <TextInput
              value={description}
              onChange={setDescription}
              placeholder="Tuỳ chọn"
            />
          </Field>
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={saveCategory}>
            {editingId ? "Cập nhật danh mục" : "Thêm danh mục"}
          </Button>
          {editingId && (
            <Button
              variant="ghost"
              onClick={() => {
                setEditingId(null);
                setName("");
                setDescription("");
              }}
            >
              Huỷ
            </Button>
          )}
        </div>
        {categories.length > 0 && (
          <ul className="mt-4 space-y-2 text-sm">
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex items-center justify-between gap-2 border-b border-stone-100 pb-2 last:border-0"
              >
                <span>
                  <b>{category.name}</b>
                  {category.description ? ` — ${category.description}` : ""}
                </span>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditingId(category.id);
                    setName(category.name);
                    setDescription(category.description ?? "");
                  }}
                >
                  Sửa
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title={`Sản phẩm trên sàn (${products.length})`}
        action={
          <div className="w-48">
            <Select
              value={status}
              onChange={setStatus}
              options={[
                { value: "", label: "Tất cả trạng thái" },
                { value: "ACTIVE", label: "Đang bán" },
                { value: "HIDDEN", label: "Đang ẩn" },
                { value: "OUT_OF_STOCK", label: "Hết hàng" },
              ]}
            />
          </div>
        }
      >
        {products.length === 0 ? (
          <Empty>Không có sản phẩm nào.</Empty>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3 last:border-0"
              >
                <div className="text-sm">
                  <p className="font-medium">
                    #{product.id} {product.name}{" "}
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
                    {product.hiddenByStore && (
                      <Badge tone="danger">Cửa hàng tạm ngưng</Badge>
                    )}
                  </p>
                  <p className="text-slate-600">
                    Shop #{product.storeId} · {product.categoryName} ·{" "}
                    {formatCurrency(product.effectivePrice)} · tồn{" "}
                    {product.stockQuantity}
                  </p>
                </div>
                <div className="flex gap-2">
                  {product.status === "HIDDEN" ? (
                    <Button onClick={() => setProductStatus(product, "ACTIVE")}>
                      Cho bán lại
                    </Button>
                  ) : (
                    <Button
                      variant="danger"
                      onClick={() => setProductStatus(product, "HIDDEN")}
                    >
                      Ẩn khỏi sàn
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
