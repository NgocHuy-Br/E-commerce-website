"use client";

import { useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

type Product = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stockQuantity: number;
  imageUrl: string | null;
};

type CartItem = {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
};

type AuthResponse = {
  accessToken: string;
  email: string;
  roles: string[];
};

type Profile = { email: string; fullName: string | null; phoneNumber: string | null };
type Store = { id: number; name: string; status: string };
type Category = { id: number; name: string };
type Account = { id: number; email: string; roles: string[]; status: string };
type Order = { id: number; status: string; totalAmount: number };

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [message, setMessage] = useState("Sẵn sàng kết nối API Gateway.");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"buyer" | "seller" | "admin">("buyer");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [storeName, setStoreName] = useState("");
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");

  const request = async <T,>(path: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `HTTP ${response.status}`);
    }
    return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  };

  const authenticate = async (path: "/api/auth/register" | "/api/auth/login") => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error(await response.text());
      const result = (await response.json()) as AuthResponse;
      setAuth(result);
      setMessage(`${path.endsWith("register") ? "Đăng ký" : "Đăng nhập"} thành công: ${result.email}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể xác thực tài khoản.");
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async () => {
    try {
      setProducts(await request<Product[]>(`/api/products?keyword=${encodeURIComponent(keyword)}`));
      setMessage("Đã tải danh sách sản phẩm.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải sản phẩm.");
    }
  };

  const addToCart = async (product: Product) => {
    try {
      setCart(await request<CartItem[]>("/api/orders/cart/items", {
        method: "POST",
        body: JSON.stringify({ productId: product.id, productName: product.name, unitPrice: product.price, quantity: 1 }),
      }));
      setMessage(`Đã thêm ${product.name} vào giỏ hàng.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Cần đăng nhập để thêm giỏ hàng.");
    }
  };

  const loadCart = async () => {
    try {
      setCart(await request<CartItem[]>("/api/orders/cart"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải giỏ hàng.");
    }
  };

  const checkout = async () => {
    try {
      const order = await request<{ id: number }>("/api/orders/checkout", {
        method: "POST",
        body: JSON.stringify({ shippingAddress: "Địa chỉ demo, Hà Nội", paymentMethod: "COD" }),
      });
      setCart([]);
      setMessage(`Đặt hàng thành công. Mã đơn: #${order.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể đặt hàng.");
    }
  };

  const loadBuyerData = async () => {
    try {
      const [profileData, orderData] = await Promise.all([request<Profile>("/api/users/me"), request<Order[]>("/api/orders/mine")]);
      setProfile(profileData);
      setOrders(orderData);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể tải dữ liệu buyer."); }
  };

  const createStore = async () => {
    try {
      const data = await request<Store>("/api/stores", { method: "POST", body: JSON.stringify({ name: storeName, description: "Cửa hàng trên sàn", address: "Hà Nội", phoneNumber: "0900000000", logoUrl: null }) });
      setStore(data); setMessage("Đã gửi yêu cầu mở shop. Admin cần duyệt trước khi đăng sản phẩm.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể tạo shop."); }
  };

  const loadSellerData = async () => {
    try {
      const [storeData, categoryData] = await Promise.all([request<Store>("/api/stores/mine"), request<Category[]>("/api/products/categories")]);
      setStore(storeData); setCategories(categoryData);
    } catch { setMessage("Chưa có shop hoặc chưa có quyền SELLER. Hãy tạo shop và chờ admin duyệt."); }
  };

  const createProduct = async () => {
    if (!store || categories.length === 0) return;
    try {
      await request<Product>("/api/products", { method: "POST", body: JSON.stringify({ storeId: store.id, categoryId: categories[0].id, name: productName, description: "Sản phẩm mới", price: Number(productPrice), stockQuantity: 10, imageUrl: null }) });
      setMessage("Đã đăng sản phẩm."); setProductName(""); setProductPrice("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể đăng sản phẩm."); }
  };

  const loadAdminData = async () => {
    try { setAccounts(await request<Account[]>("/api/auth/admin/accounts")); }
    catch { setMessage("Tài khoản hiện tại không có quyền ADMIN."); }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div><p className="text-xl font-semibold">Mua Sắm Nhom14</p><p className="text-sm text-slate-500">E-commerce microservices demo</p></div>
          <p className="text-sm text-slate-600">{auth ? `${auth.email} (${auth.roles.join(", ")})` : "Chưa đăng nhập"}</p>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-5">
          <section className="border border-stone-200 bg-white p-5 shadow-sm">
            <h1 className="text-lg font-semibold">Tài khoản</h1>
            <div className="mt-4 space-y-3"><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="w-full border border-stone-300 px-3 py-2" /><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Mật khẩu (ít nhất 6 ký tự)" className="w-full border border-stone-300 px-3 py-2" /></div>
            <div className="mt-3 flex gap-2"><button onClick={() => authenticate("/api/auth/register")} disabled={loading} className="bg-teal-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Đăng ký</button><button onClick={() => authenticate("/api/auth/login")} disabled={loading} className="border border-teal-700 px-3 py-2 text-sm font-medium text-teal-800 disabled:opacity-50">Đăng nhập</button></div>
          </section>
          <section className="border border-stone-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Giỏ hàng</h2><button onClick={loadCart} className="text-sm text-teal-800">Làm mới</button></div><div className="mt-3 space-y-2 text-sm">{cart.length === 0 ? <p className="text-slate-500">Chưa có sản phẩm.</p> : cart.map((item) => <p key={item.productId}>{item.productName} x{item.quantity} - {item.unitPrice.toLocaleString("vi-VN")}đ</p>)}</div>{cart.length > 0 && <button onClick={checkout} className="mt-4 bg-slate-900 px-3 py-2 text-sm font-medium text-white">Đặt hàng COD</button>}</section>
        </aside>
        <section>
          <div className="border border-stone-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-600">{message}</p><p className="mt-1 text-xs text-slate-400">Gateway: {API_BASE_URL}</p></div>
          <div className="mt-5 flex flex-wrap gap-2 border-b border-stone-200 pb-3">
            <button onClick={() => { setView("buyer"); loadBuyerData(); }} className={`px-3 py-2 text-sm font-medium ${view === "buyer" ? "bg-teal-700 text-white" : "border border-stone-300"}`}>Người mua</button>
            <button onClick={() => { setView("seller"); loadSellerData(); }} disabled={!auth?.roles.includes("SELLER") && !auth?.roles.includes("BUYER")} className={`px-3 py-2 text-sm font-medium ${view === "seller" ? "bg-teal-700 text-white" : "border border-stone-300"}`}>Người bán</button>
            <button onClick={() => { setView("admin"); loadAdminData(); }} disabled={!auth?.roles.includes("ADMIN")} className={`px-3 py-2 text-sm font-medium ${view === "admin" ? "bg-teal-700 text-white" : "border border-stone-300"}`}>Quản trị</button>
          </div>
          {view === "buyer" && <><div className="mt-6 flex gap-2"><input value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && searchProducts()} placeholder="Tìm sản phẩm" className="min-w-0 flex-1 border border-stone-300 bg-white px-3 py-2" /><button onClick={searchProducts} className="bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900">Tìm kiếm</button></div>
          {profile && <div className="mt-4 border border-stone-200 bg-white p-4 text-sm"><b>Hồ sơ:</b> {profile.fullName || "Chưa cập nhật tên"} · {profile.email} · {profile.phoneNumber || "Chưa có SĐT"}</div>}
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{products.map((product) => <article key={product.id} className="border border-stone-200 bg-white p-4 shadow-sm"><div className="flex aspect-square items-center justify-center bg-stone-100 text-sm text-slate-400">{product.imageUrl ? "Có ảnh sản phẩm" : "Chưa có ảnh"}</div><h2 className="mt-3 font-semibold">{product.name}</h2><p className="mt-1 line-clamp-2 text-sm text-slate-600">{product.description || "Chưa có mô tả"}</p><p className="mt-3 font-semibold text-teal-800">{product.price.toLocaleString("vi-VN")}đ</p><button onClick={() => addToCart(product)} disabled={!auth || product.stockQuantity < 1} className="mt-3 w-full bg-teal-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{auth ? "Thêm vào giỏ" : "Đăng nhập để mua"}</button></article>)}</div>
          {orders.length > 0 && <div className="mt-5 border border-stone-200 bg-white p-4 text-sm"><b>Đơn hàng:</b>{orders.map((order) => <p key={order.id}>#{order.id} · {order.status} · {order.totalAmount.toLocaleString("vi-VN")}đ</p>)}</div>}</>}
          {view === "seller" && <div className="mt-6 space-y-4"><div className="border border-stone-200 bg-white p-5"><h2 className="font-semibold">Cửa hàng của tôi</h2><p className="mt-2 text-sm">{store ? `${store.name} · ${store.status}` : "Chưa có cửa hàng"}</p><div className="mt-3 flex gap-2"><input value={storeName} onChange={(event) => setStoreName(event.target.value)} placeholder="Tên cửa hàng" className="flex-1 border border-stone-300 px-3 py-2"/><button onClick={createStore} className="bg-teal-700 px-3 py-2 text-sm text-white">Mở shop</button></div></div>{store?.status === "ACTIVE" && <div className="border border-stone-200 bg-white p-5"><h2 className="font-semibold">Đăng sản phẩm</h2><div className="mt-3 flex gap-2"><input value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="Tên sản phẩm" className="flex-1 border border-stone-300 px-3 py-2"/><input value={productPrice} onChange={(event) => setProductPrice(event.target.value)} placeholder="Giá" type="number" className="w-32 border border-stone-300 px-3 py-2"/><button onClick={createProduct} className="bg-amber-500 px-3 py-2 text-sm">Đăng bán</button></div></div>}</div>}
          {view === "admin" && <div className="mt-6 border border-stone-200 bg-white p-5"><h2 className="font-semibold">Tài khoản hệ thống</h2><div className="mt-3 space-y-2 text-sm">{accounts.map((account) => <p key={account.id}>#{account.id} · {account.email} · {account.roles.join(", ")} · {account.status}</p>)}</div></div>}
        </section>
      </main>
    </div>
  );
}