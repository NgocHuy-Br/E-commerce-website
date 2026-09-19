package order_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import order_service.entity.PaymentMethod;

public record CheckoutRequest(
        @NotBlank(message = "Địa chỉ giao hàng không được để trống") String shippingAddress,
        @NotNull(message = "Hãy chọn phương thức thanh toán") PaymentMethod paymentMethod,
        String voucherCode) {
}
