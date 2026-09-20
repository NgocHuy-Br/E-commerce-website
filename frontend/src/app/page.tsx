import { Suspense } from "react";
import { ProductCatalog } from "./components/buyer/ProductCatalog";
import { Card } from "./components/ui";

export default function HomePage() {
  return (
    <>
      <div className="mb-5">
        <h1 className="text-xl font-semibold">Sản phẩm đang bán</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tìm kiếm theo tên, danh mục, khoảng giá. Bấm vào sản phẩm để xem chi tiết và đánh giá.
        </p>
      </div>
      <Suspense fallback={<Card>Đang tải sản phẩm...</Card>}>
        <ProductCatalog />
      </Suspense>
    </>
  );
}
