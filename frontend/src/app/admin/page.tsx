"use client";

import { useState } from "react";
import { AccountManager } from "../components/admin/AccountManager";
import { CatalogModeration } from "../components/admin/CatalogModeration";
import { Dashboard } from "../components/admin/Dashboard";
import { OrderMonitor } from "../components/admin/OrderMonitor";
import { StoreApproval } from "../components/admin/StoreApproval";
import { VoucherManager } from "../components/admin/VoucherManager";
import { Card, PageHeader, RequireLogin } from "../components/ui";
import { useSession } from "../lib/session";

type AdminTab =
  "dashboard" | "accounts" | "stores" | "catalog" | "orders" | "vouchers";

const tabs: { key: AdminTab; label: string }[] = [
  { key: "dashboard", label: "Tổng quan" },
  { key: "accounts", label: "Tài khoản" },
  { key: "stores", label: "Cửa hàng" },
  { key: "catalog", label: "Danh mục & sản phẩm" },
  { key: "orders", label: "Đơn hàng" },
  { key: "vouchers", label: "Mã giảm giá" },
];

export default function AdminPage() {
  const { token, hasRole } = useSession();
  const [tab, setTab] = useState<AdminTab>("dashboard");

  if (!token) {
    return (
      <>
        <PageHeader title="Quản trị nền tảng" back={false} />
        <RequireLogin
          next="/admin"
          message="Đăng nhập bằng tài khoản quản trị viên."
        />
      </>
    );
  }

  if (!hasRole("ADMIN")) {
    return (
      <>
        <PageHeader title="Quản trị nền tảng" back={false} />
        <Card>
          <p className="text-sm text-slate-600">
            Tài khoản hiện tại không có quyền ADMIN.
          </p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Quản trị nền tảng"
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

      {tab === "dashboard" && <Dashboard />}
      {tab === "accounts" && <AccountManager />}
      {tab === "stores" && <StoreApproval />}
      {tab === "catalog" && <CatalogModeration />}
      {tab === "orders" && <OrderMonitor />}
      {tab === "vouchers" && <VoucherManager />}
    </>
  );
}
