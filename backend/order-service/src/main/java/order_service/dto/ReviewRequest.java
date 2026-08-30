package order_service.dto;

import jakarta.validation.constraints.*;

public record ReviewRequest(@NotNull Long productId, @Min(1) @Max(5) int rating, @Size(max = 2000) String comment) {
}