package order_service.dto;

import java.math.BigDecimal;

public record CartItemResponse(Long productId, Long storeId, String productName, BigDecimal unitPrice,
        BigDecimal originalPrice, int discountPercent, int quantity, int stockQuantity, String imageUrl) {
}
