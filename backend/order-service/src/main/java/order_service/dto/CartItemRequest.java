package order_service.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/** Giỏ hàng chỉ nhận productId và số lượng, giá lấy từ product-service để tránh gian lận giá. */
public record CartItemRequest(@NotNull Long productId, @Positive int quantity) {
}
