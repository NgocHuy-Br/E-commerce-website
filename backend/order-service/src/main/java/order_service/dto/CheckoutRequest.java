package order_service.dto;

import jakarta.validation.constraints.NotBlank;

public record CheckoutRequest(@NotBlank String shippingAddress, @NotBlank String paymentMethod) {
}