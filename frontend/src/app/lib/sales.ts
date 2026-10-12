/** Số lượng đã bán hiển thị tạm cho sản phẩm chưa có dữ liệu bán thật. */
export function soldCountForProduct(productId: number): number {
  const value = (productId * 17 + 29) % 63;
  return 3 + value;
}
