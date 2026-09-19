package order_service.dto;

import java.time.Instant;

public record ReviewResponse(Long id, Long orderId, Long productId, Long buyerId, int rating, String comment,
        Instant createdAt) {
}
