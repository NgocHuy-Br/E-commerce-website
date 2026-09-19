"use client";

import { useCallback, useState } from "react";
import { AccountPanel } from "./components/AccountPanel";
import { AccountManager } from "./components/admin/AccountManager";
import { CatalogModeration } from "./components/admin/CatalogModeration";
import { Dashboard } from "./components/admin/Dashboard";
import { OrderMonitor } from "./components/admin/OrderMonitor";
import { StoreApproval } from "./components/admin/StoreApproval";
import { VoucherManager } from "./components/admin/VoucherManager";
import { MyOrders } from "./components/buyer/MyOrders";
import { ProductCatalog } from "./components/buyer/ProductCatalog";
import { ProfilePanel } from "./components/buyer/ProfilePanel";
import { CartPanel } from "./components/CartPanel";
import { ProductManager } from "./components/seller/ProductManager";
import { SellerOrders } from "./components/seller/SellerOrders";
import { StorePanel } from "./components/seller/StorePanel";
import { Badge, Card } from "./components/ui";
import { api, API_BASE_URL, errorMessage } from "./lib/api";
import { useLoadEffect } from "./lib/hooks";
import { useSession } from "./lib/session";
import type { Address, CartItem, Product, Store } from "./lib/types";

type MainTab = "buyer" | "seller" | "admin";
type BuyerTab = "catalog" | "orders" | "profile";
type SellerTab = "store" | "products" | "orders";
type AdminTab =
  "dashboard" | "accounts" | "stores" | "catalog" | "orders" | "vouchers";

const toneClasses: Record<string, string> = {
  info: "text-slate-600",
  success: "text-teal-800",
  error: "text-rose-600",
};

export default function Home() {
  const { session, token, signIn, signOut, hasRole } = useSession();
  const [message, setMessage] = useState({
    text: "Sẵn sàng kết nối API Gateway.",
    tone: "info" as "info" | "success" | "error",
  });
  const [mainTab, setMainTab] = useState<MainTab>("buyer");
  const [buyerTab, setBuyerTab] = useState<BuyerTab>("catalog");
  const [sellerTab, setSellerTab] = useState<SellerTab>("store");
  const [adminTab, setAdminTab] = useState<AdminTab>("dashboard");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [orderSignal, setOrderSignal] = useState(0);

  const notify = useCallback(
    (text: string, tone: "info" | "success" | "error" = "info") => {
      setMessage({ text, tone });
    },
    [],
  );

  /** Nạp giỏ hàng và cửa hàng của người dùng sau khi đăng nhập. */
  const loadSessionData = useCallback(async () => {
    if (!token) return;
    const [cartData, storeData] = await Promise.all([
      api<CartItem[]>("/api/orders/cart", { token }).catch(
        () => [] as CartItem[],
      ),
      api<Store>("/api/stores/mine", { token }).catch(() => null),
    ]);
    setCart(cartData);
    setStore(storeData);
  }, [token]);

  useLoadEffect(loadSessionData);

  const addToCart = useCallback(
    async (product: Product, quantity: number) => {
      if (!token) {
        notify("Bạn cần đăng nhập để mua hàng.", "error");
        return;
      }
      try {
        setCart(
          await api<CartItem[]>("/api/orders/cart/items", {
            method: "POST",
            token,
            body: { productId: product.id, quantity },
          }),
        );
        notify(`Đã thêm ${product.name} vào giỏ hàng.`, "success");
      } catch (error) {
        notify(errorMessage(error, "Không thể thêm vào giỏ hàng."), "error");
      }
    },
    [token, notify],
  );

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5">
          <div>
            <p className="text-xl font-semibold">Mua Sắm Nhom14</p>
            <p className="text-sm text-slate-500">
              Sàn thương mại điện tử trên kiến trúc microservices
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Badge tone="neutral">Giỏ hàng: {cartCount}</Badge>
            <span className="text-slate-600">
              {session
                ? `${session.email} (${session.roles.join(", ")})`
                : "Chưa đăng nhập"}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-5">
          <AccountPanel
            session={session}
            onSignIn={(next) => {
              signIn(next);
              setMainTab("buyer");
            }}
            onSignOut={() => {
              signOut();
              setCart([]);
              setStore(null);
              setAddresses([]);
              notify("Đã đăng xuất.", "info");
            }}
            notify={notify}
          />
          {token && (
            <CartPanel
              token={token}
              cart={cart}
              addresses={addresses}
              onCartChange={setCart}
              onOrdered={() => {
                setOrderSignal((value) => value + 1);
                setBuyerTab("orders");
                setMainTab("buyer");
              }}
              notify={notify}
            />
          )}
        </aside>

        <section className="space-y-5">
          <Card>
            <p className={`text-sm ${toneClasses[message.tone]}`}>
              {message.text}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              API Gateway: {API_BASE_URL}
            </p>
          </Card>

          <nav className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
            <TabButton
              active={mainTab === "buyer"}
              onClick={() => setMainTab("buyer")}
            >
              Người mua
            </TabButton>
            <TabButton
              active={mainTab === "seller"}
              disabled={!session}
              onClick={() => setMainTab("seller")}
            >
              Người bán
            </TabButton>
            <TabButton
              active={mainTab === "admin"}
              disabled={!hasRole("ADMIN")}
              onClick={() => setMainTab("admin")}
            >
              Quản trị viên
            </TabButton>
          </nav>

          {mainTab === "buyer" && (
            <>
              <SubTabs
                tabs={[
                  { key: "catalog", label: "Tìm kiếm hàng hoá" },
                  { key: "orders", label: "Đơn hàng của tôi" },
                  { key: "profile", label: "Thông tin cá nhân" },
                ]}
                active={buyerTab}
                onChange={(key) => setBuyerTab(key as BuyerTab)}
              />
              {buyerTab === "catalog" && (
                <ProductCatalog
                  token={token}
                  onAddToCart={addToCart}
                  notify={notify}
                />
              )}
              {buyerTab === "orders" && (
                <MyOrders key={orderSignal} token={token} notify={notify} />
              )}
              {buyerTab === "profile" && (
                <ProfilePanel
                  token={token}
                  onAddressesChange={setAddresses}
                  notify={notify}
                />
              )}
            </>
          )}

          {mainTab === "seller" && (
            <>
              <SubTabs
                tabs={[
                  { key: "store", label: "Cửa hàng" },
                  { key: "products", label: "Đăng bán & khuyến mãi" },
                  { key: "orders", label: "Đơn hàng của shop" },
                ]}
                active={sellerTab}
                onChange={(key) => setSellerTab(key as SellerTab)}
              />
              {sellerTab === "store" && (
                <StorePanel
                  key={store?.id ?? "new-store"}
                  token={token}
                  store={store}
                  onStoreChange={setStore}
                  notify={notify}
                />
              )}
              {sellerTab === "products" && (
                <ProductManager token={token} store={store} notify={notify} />
              )}
              {sellerTab === "orders" &&
                (hasRole("SELLER") ? (
                  <SellerOrders token={token} notify={notify} />
                ) : (
                  <Card>
                    <p className="text-sm text-slate-500">
                      Bạn cần được cấp quyền SELLER (sau khi admin duyệt cửa
                      hàng) để xem đơn hàng.
                    </p>
                  </Card>
                ))}
            </>
          )}

          {mainTab === "admin" && hasRole("ADMIN") && (
            <>
              <SubTabs
                tabs={[
                  { key: "dashboard", label: "Tổng quan" },
                  { key: "accounts", label: "Tài khoản" },
                  { key: "stores", label: "Cửa hàng" },
                  { key: "catalog", label: "Danh mục & sản phẩm" },
                  { key: "orders", label: "Đơn hàng" },
                  { key: "vouchers", label: "Mã giảm giá" },
                ]}
                active={adminTab}
                onChange={(key) => setAdminTab(key as AdminTab)}
              />
              {adminTab === "dashboard" && (
                <Dashboard token={token} notify={notify} />
              )}
              {adminTab === "accounts" && (
                <AccountManager token={token} notify={notify} />
              )}
              {adminTab === "stores" && (
                <StoreApproval token={token} notify={notify} />
              )}
              {adminTab === "catalog" && (
                <CatalogModeration token={token} notify={notify} />
              )}
              {adminTab === "orders" && (
                <OrderMonitor token={token} notify={notify} />
              )}
              {adminTab === "vouchers" && (
                <VoucherManager token={token} notify={notify} />
              )}
            </>
          )}
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-white py-5 text-center text-xs text-slate-400">
        Nhóm 14 · Thực tập · Nền tảng TMĐT microservices (Spring Boot + Next.js)
      </footer>
    </div>
  );
}

function TabButton({
  active,
  disabled = false,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-teal-700 text-white"
          : "border border-stone-300 text-slate-700 hover:bg-stone-100"
      }`}
    >
      {children}
    </button>
  );
}

function SubTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`px-3 py-1.5 text-sm transition ${
            active === tab.key
              ? "border-b-2 border-teal-700 font-medium text-teal-800"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
