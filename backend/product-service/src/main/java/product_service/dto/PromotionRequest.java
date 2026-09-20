package product_service.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

/** Chương trình khuyến mãi của một sản phẩm. */
public record PromotionRequest(
        // Phần trăm giảm là số nguyên từ 1 đến 90
        @Min(value = 1, message = "Phần trăm giảm phải từ 1 đến 90") //
        @Max(value = 90, message = "Phần trăm giảm phải từ 1 đến 90") int discountPercent,

        @NotNull(message = "Hãy chọn thời gian bắt đầu") Instant startsAt,

        @NotNull(message = "Hãy chọn thời gian kết thúc") Instant endsAt) {
}
