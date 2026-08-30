package product_service.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record PromotionRequest(
        @Min(1) @Max(90) int discountPercent,
        @NotNull Instant startsAt,
        @NotNull Instant endsAt) {
}
