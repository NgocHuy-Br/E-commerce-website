"use client";

import { MyOrders } from "../components/buyer/MyOrders";
import { PageHeader, RequireLogin } from "../components/ui";
import { useSession } from "../lib/session";

export default function OrdersPage() {
  const { token } = useSession();

  return (
    <>
      <PageHeader
        title="Đơn hàng của tôi"
        description="Theo dõi trạng thái, thanh toán, huỷ đơn và đánh giá sản phẩm đã nhận."
      />
      {token ? <MyOrders /> : <RequireLogin next="/orders" message="Đăng nhập để xem đơn hàng của bạn." />}
    </>
  );
}
