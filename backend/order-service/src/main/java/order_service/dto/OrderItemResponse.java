package order_service.dto;

import java.math.BigDecimal;

public record OrderItemResponse(Long productId, Long storeId, String productName, BigDecimal unitPrice, int quantity,
        boolean reviewed) {
}
