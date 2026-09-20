package product_service.dto;

import java.math.BigDecimal;
import product_service.entity.ProductStatus;

public record ProductResponse(Long id, Long sellerId, Long storeId, Long categoryId, String categoryName,
        String name, String description, BigDecimal price, int discountPercent, BigDecimal effectivePrice,
        int stockQuantity, String imageUrl, ProductStatus status, boolean hiddenByStore) {
}
