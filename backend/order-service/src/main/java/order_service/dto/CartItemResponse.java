package order_service.dto;

import java.math.BigDecimal;

public record CartItemResponse(Long productId, String productName, BigDecimal unitPrice, int quantity) {
}
