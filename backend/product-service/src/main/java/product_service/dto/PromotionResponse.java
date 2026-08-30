package product_service.dto;

import java.time.Instant;

public record PromotionResponse(Long id, Long productId, int discountPercent, Instant startsAt, Instant endsAt) {
}
