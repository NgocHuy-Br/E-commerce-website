package order_service.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/** Giỏ hàng chỉ nhận mã sản phẩm và số lượng, giá lấy từ product-service để tránh gian lận giá. */
public record CartItemRequest(
        @NotNull(message = "Thiếu mã sản phẩm") Long productId,

        @Positive(message = "Số lượng phải là số lớn hơn 0") //
        @Max(value = 1000, message = "Mỗi lần chỉ thêm tối đa 1000 sản phẩm") int quantity) {
}
