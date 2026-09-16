package order_service.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;

public record VoucherRequest(@NotBlank String code, @Min(1) @Max(90) int discountPercent,
        @NotNull @PositiveOrZero BigDecimal minimumOrderAmount, @Positive int remainingUses, @NotNull Instant startsAt,
        @NotNull Instant endsAt) {
}