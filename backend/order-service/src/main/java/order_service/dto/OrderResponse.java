package order_service.dto;

import java.math.BigDecimal;
import java.util.List;
import order_service.entity.OrderStatus;
import order_service.entity.PaymentStatus;

public record OrderResponse(Long id, Long buyerId, BigDecimal totalAmount, String shippingAddress, String paymentMethod,
                PaymentStatus paymentStatus, OrderStatus status, List<CartItemResponse> items) {
}