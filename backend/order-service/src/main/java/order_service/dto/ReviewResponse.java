package order_service.dto;

public record ReviewResponse(Long id, Long productId, int rating, String comment) {
}