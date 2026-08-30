package product_service.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ProductRequest(
        @NotNull Long storeId, @NotNull Long categoryId, @NotBlank @Size(max = 200) String name,
        @Size(max = 4000) String description, @NotNull @PositiveOrZero BigDecimal price,
        @PositiveOrZero int stockQuantity, @Size(max = 500) String imageUrl) {
}
