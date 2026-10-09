"use client";

import { useCallback, useState } from "react";
import { ProductManager } from "../components/seller/ProductManager";
import { PromotionManager } from "../components/seller/PromotionManager";
import { SellerOrders } from "../components/seller/SellerOrders";
import { StorePanel } from "../components/seller/StorePanel";
import {
  AdminNotAllowed,
  Card,
  RequireLogin,
} from "../components/ui";
import { api } from "../lib/api";
import { useLoadEffect } from "../lib/hooks";
import { useSession } from "../lib/session";
import type { Store } from "../lib/types";

type SellerTab = "store" | "products" | "promotions" | "orders";

const tabs: { key: SellerTab; label: string }[] = [
  { key: "store", label: "Cửa hàng của tôi" },
  { key: "products", label: "Sản phẩm" },
  { key: "promotions", label: "Khuyến mãi" },
  { key: "orders", label: "Quản lý đơn hàng" },
];

export default function SellerPage() {
  const { token, hasRole, isAdmin } = useSession();
  const [tab, setTab] = useState<SellerTab>("store");
  const [store, setStore] = useState<Store | null>(null);
  const [promotionProductId, setPromotionProductId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setStore(await api<Store>("/api/stores/mine", { token }).catch(() => null));
  }, [token]);

  useLoadEffect(load);

  if (!token) {
    return (
      <>
        <RequireLogin
          next="/seller"
          message="Đăng nhập để mở cửa hàng và đăng bán."
        />
      </>
    );
  }

  if (isAdmin) {
    return (
      <>
        <AdminNotAllowed feature="chức năng bán hàng" />
      </>
    );
  }

  return (
    <>
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-stone-200 pb-2" role="tablist" aria-label="Kênh người bán">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition ${
              tab === item.key
                ? "border-teal-700 text-teal-800"
                : "border-transparent text-slate-600 hover:border-stone-300 hover:text-slate-900"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "store" && (
        <StorePanel
          key={store?.id ?? "new-store"}
          store={store}
          onStoreChange={setStore}
        />
      )}
      {tab === "products" && (
        <ProductManager
          store={store}
          onPromotion={(productId) => {
            setPromotionProductId(productId);
            setTab("promotions");
          }}
        />
      )}
      {tab === "promotions" && (
        <PromotionManager store={store} initialProductId={promotionProductId} />
      )}
      {tab === "orders" &&
        (hasRole("SELLER") ? (
          <SellerOrders />
        ) : (
          <Card title="Quản lý đơn hàng">
            <p className="text-sm text-slate-500">
              Cửa hàng cần được admin duyệt để xem và xử lý đơn hàng.
            </p>
          </Card>
        ))}
    </>
  );
}
