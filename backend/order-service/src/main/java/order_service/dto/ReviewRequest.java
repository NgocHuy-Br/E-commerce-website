package order_service.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Đánh giá của người mua sau khi nhận hàng. */
public record ReviewRequest(
        @NotNull(message = "Thiếu mã sản phẩm") Long productId,

        @Min(value = 1, message = "Số sao phải từ 1 đến 5") //
        @Max(value = 5, message = "Số sao phải từ 1 đến 5") int rating,

        @Size(max = 2000, message = "Nhận xét tối đa 2000 ký tự") String comment) {
}
