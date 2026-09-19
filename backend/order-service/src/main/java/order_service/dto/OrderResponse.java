package order_service.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import order_service.entity.OrderStatus;
import order_service.entity.PaymentMethod;
import order_service.entity.PaymentStatus;

public record OrderResponse(Long id, Long buyerId, BigDecimal totalAmount, BigDecimal discountAmount,
        String voucherCode, String shippingAddress, PaymentMethod paymentMethod, PaymentStatus paymentStatus,
        OrderStatus status, Instant createdAt, List<OrderItemResponse> items) {
}
