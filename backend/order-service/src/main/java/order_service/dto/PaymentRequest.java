package order_service.dto;

import jakarta.validation.constraints.NotNull;
import order_service.entity.PaymentMethod;

public record PaymentRequest(
        @NotNull(message = "Hãy chọn phương thức thanh toán") PaymentMethod paymentMethod) {
}
