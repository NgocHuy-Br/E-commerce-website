"use client";

import { useState } from "react";
import { AccountManager } from "../components/admin/AccountManager";
import { AuditViewer } from "../components/admin/AuditViewer";
import { CatalogModeration } from "../components/admin/CatalogModeration";
import { Dashboard } from "../components/admin/Dashboard";
import { OrderMonitor } from "../components/admin/OrderMonitor";
import { ReportPanel } from "../components/admin/ReportPanel";
import { ReviewModeration } from "../components/admin/ReviewModeration";
import { SystemSettings } from "../components/admin/SystemSettings";
import { StoreApproval } from "../components/admin/StoreApproval";
import { VoucherManager } from "../components/admin/VoucherManager";
import { WithdrawalManager } from "../components/admin/WithdrawalManager";
import { Card, PageHeader, RequireLogin } from "../components/ui";
import { useSession } from "../lib/session";

type AdminTab =
  | "dashboard"
  | "reports"
  | "accounts"
  | "stores"
  | "catalog"
  | "orders"
  | "reviews"
  | "withdrawals"
  | "vouchers"
  | "settings"
  | "audit";

const tabs: { key: AdminTab; label: string }[] = [
  { key: "dashboard", label: "Tổng quan" },
  { key: "reports", label: "Báo cáo" },
  { key: "accounts", label: "Tài khoản" },
  { key: "stores", label: "Cửa hàng" },
  { key: "catalog", label: "Danh mục & sản phẩm" },
  { key: "orders", label: "Đơn hàng" },
  { key: "reviews", label: "Đánh giá" },
  { key: "withdrawals", label: "Rút tiền" },
  { key: "vouchers", label: "Mã giảm giá" },
  { key: "settings", label: "Cài đặt hệ thống" },
  { key: "audit", label: "Nhật ký" },
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
      {tab === "reports" && <ReportPanel />}
      {tab === "accounts" && <AccountManager />}
      {tab === "stores" && <StoreApproval />}
      {tab === "catalog" && <CatalogModeration />}
      {tab === "orders" && <OrderMonitor />}
      {tab === "reviews" && <ReviewModeration />}
      {tab === "withdrawals" && <WithdrawalManager />}
      {tab === "vouchers" && <VoucherManager />}
      {tab === "settings" && <SystemSettings />}
      {tab === "audit" && <AuditViewer />}
    </>
  );
}
