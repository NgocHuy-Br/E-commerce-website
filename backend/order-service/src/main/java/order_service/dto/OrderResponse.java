package order_service.dto;

import java.math.BigDecimal;
import java.util.List;
import order_service.entity.OrderStatus;

public record OrderResponse(Long id, Long buyerId, BigDecimal totalAmount, String shippingAddress, String paymentMethod,
        OrderStatus status, List<CartItemResponse> items) {
}