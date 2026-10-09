package product_service.dto;

import java.time.Instant;

public record PromotionResponse(
        Long id,
        Long productId,
        String campaignId,
        String name,
        int discountPercent,
        Instant startsAt,
        Instant endsAt,
        boolean cancelled) {
}
