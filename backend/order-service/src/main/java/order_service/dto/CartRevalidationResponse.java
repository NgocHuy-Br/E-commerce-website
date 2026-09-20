package order_service.dto;

import java.util.List;

/** Kết quả kiểm tra lại giỏ hàng: giỏ sau khi đồng bộ và danh sách thay đổi cần người mua xác nhận. */
public record CartRevalidationResponse(List<CartItemResponse> items, List<CartChange> changes) {

    public boolean hasChanges() {
        return !changes.isEmpty();
    }
}
