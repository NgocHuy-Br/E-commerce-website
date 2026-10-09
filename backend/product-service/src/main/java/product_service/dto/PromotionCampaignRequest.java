package product_service.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public record PromotionCampaignRequest(
        @NotBlank(message = "Tên khuyến mãi không được để trống") @Size(max = 120, message = "Tên khuyến mãi tối đa 120 ký tự") String name,

        @NotEmpty(message = "Hãy chọn ít nhất một sản phẩm") List<@NotNull(message = "Mã sản phẩm không hợp lệ") Long> productIds,

        @Min(value = 1, message = "Phần trăm giảm phải từ 1 đến 90") @Max(value = 90, message = "Phần trăm giảm phải từ 1 đến 90") int discountPercent,

        @NotNull(message = "Hãy chọn thời gian bắt đầu") Instant startsAt,
        @NotNull(message = "Hãy chọn thời gian kết thúc") Instant endsAt) {
}
