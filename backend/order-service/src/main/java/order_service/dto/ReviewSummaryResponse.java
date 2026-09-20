package order_service.dto;

public record ReviewSummaryResponse(Long productId, double averageRating, long reviewCount) {
}
