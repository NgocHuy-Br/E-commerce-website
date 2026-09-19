"use client";

import { useCallback, useState } from "react";
import { ProductManager } from "../components/seller/ProductManager";
import { SellerOrders } from "../components/seller/SellerOrders";
import { StorePanel } from "../components/seller/StorePanel";
import { Card, PageHeader, RequireLogin } from "../components/ui";
import { api } from "../lib/api";
import { useLoadEffect } from "../lib/hooks";
import { useSession } from "../lib/session";
import type { Store } from "../lib/types";

type SellerTab = "store" | "products" | "orders";

const tabs: { key: SellerTab; label: string }[] = [
  { key: "store", label: "Cửa hàng" },
  { key: "products", label: "Đăng bán & khuyến mãi" },
  { key: "orders", label: "Đơn hàng của shop" },
];

export default function SellerPage() {
  const { token, hasRole } = useSession();
  const [tab, setTab] = useState<SellerTab>("store");
  const [store, setStore] = useState<Store | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setStore(await api<Store>("/api/stores/mine", { token }).catch(() => null));
  }, [token]);

  useLoadEffect(load);

  if (!token) {
    return (
      <>
        <PageHeader title="Kênh người bán" back={false} />
        <RequireLogin next="/seller" message="Đăng nhập để mở cửa hàng và đăng bán." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Kênh người bán"
        description="Quản lý cửa hàng, sản phẩm, khuyến mãi và đơn hàng của shop."
        back={false}
      />

      <div className="mb-5 flex flex-wrap gap-2 border-b border-stone-200 pb-3">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`px-3 py-2 text-sm font-medium transition ${
              tab === item.key
                ? "bg-teal-700 text-white"
                : "border border-stone-300 text-slate-700 hover:bg-stone-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "store" && (
        <StorePanel key={store?.id ?? "new-store"} store={store} onStoreChange={setStore} />
      )}
      {tab === "products" && <ProductManager store={store} />}
      {tab === "orders" &&
        (hasRole("SELLER") ? (
          <SellerOrders />
        ) : (
          <Card>
            <p className="text-sm text-slate-500">
              Bạn cần được cấp quyền SELLER (sau khi quản trị viên duyệt cửa hàng) để xem đơn hàng.
            </p>
          </Card>
        ))}
    </>
  );
}
