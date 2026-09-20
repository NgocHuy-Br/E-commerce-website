"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useLoadEffect } from "../../lib/hooks";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";
import { formatCurrency } from "../../lib/format";
import type {
  AccountStats,
  CatalogStats,
  OrderStats,
  StoreStats,
} from "../../lib/types";
import { Button, Card, StatTile } from "../ui";

/** Tổng quan nền tảng cho quản trị viên. */
export function Dashboard() {
  const { token } = useSession();
  const notify = useNotify();
  const [accounts, setAccounts] = useState<AccountStats | null>(null);
  const [stores, setStores] = useState<StoreStats | null>(null);
  const [catalog, setCatalog] = useState<CatalogStats | null>(null);
  const [orders, setOrders] = useState<OrderStats | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [accountStats, storeStats, catalogStats, orderStats] =
        await Promise.all([
          api<AccountStats>("/api/auth/admin/statistics", { token }),
          api<StoreStats>("/api/stores/admin/statistics", { token }),
          api<CatalogStats>("/api/products/admin/statistics", { token }),
          api<OrderStats>("/api/orders/admin/statistics", { token }),
        ]);
      setAccounts(accountStats);
      setStores(storeStats);
      setCatalog(catalogStats);
      setOrders(orderStats);
    } catch (error) {
      notify(errorMessage(error, "Không thể tải thống kê."), "error");
    }
  }, [token, notify]);

  useLoadEffect(load);

  return (
    <Card
      title="Tổng quan nền tảng"
      action={
        <Button variant="ghost" onClick={load}>
          Làm mới
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Tài khoản" value={accounts?.totalAccounts ?? "-"} />
        <StatTile label="Người bán" value={accounts?.sellers ?? "-"} />
        <StatTile
          label="Cửa hàng chờ duyệt"
          value={stores?.pendingStores ?? "-"}
        />
        <StatTile
          label="Cửa hàng hoạt động"
          value={stores?.activeStores ?? "-"}
        />
        <StatTile
          label="Sản phẩm đang bán"
          value={catalog?.activeProducts ?? "-"}
        />
        <StatTile
          label="Khuyến mãi đang chạy"
          value={catalog?.activePromotions ?? "-"}
        />
        <StatTile label="Đơn hàng" value={orders?.totalOrders ?? "-"} />
        <StatTile
          label="Doanh thu"
          value={formatCurrency(orders?.totalRevenue ?? 0)}
        />
        <StatTile label="Đơn đã giao" value={orders?.deliveredOrders ?? "-"} />
        <StatTile label="Đơn đã huỷ" value={orders?.cancelledOrders ?? "-"} />
        <StatTile label="Lượt đánh giá" value={orders?.totalReviews ?? "-"} />
        <StatTile
          label="Điểm trung bình"
          value={orders ? orders.averageRating.toFixed(1) : "-"}
        />
      </div>
      {orders && Object.keys(orders.ordersByStatus).length > 0 && (
        <p className="mt-4 text-sm text-slate-600">
          Theo trạng thái:{" "}
          {Object.entries(orders.ordersByStatus)
            .map(([status, count]) => `${status}: ${count}`)
            .join(" · ")}
        </p>
      )}
    </Card>
  );
}
