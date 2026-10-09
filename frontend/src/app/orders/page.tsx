"use client";

import { MyOrders } from "../components/buyer/MyOrders";
import { AdminNotAllowed, RequireLogin } from "../components/ui";
import { useSession } from "../lib/session";

export default function OrdersPage() {
  const { token, isAdmin } = useSession();

  return (
    <>
      {!token ? (
        <RequireLogin
          next="/orders"
          message="Đăng nhập để xem đơn hàng của bạn."
        />
      ) : isAdmin ? (
        <AdminNotAllowed feature="chức năng đặt hàng" />
      ) : (
        <MyOrders />
      )}
    </>
  );
}
