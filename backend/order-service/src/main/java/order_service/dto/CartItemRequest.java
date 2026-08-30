package order_service.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record CartItemRequest(@NotNull Long productId, @NotBlank String productName, @NotNull BigDecimal unitPrice,
        @Positive int quantity) {
}
