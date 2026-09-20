package order_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import order_service.entity.PaymentMethod;

/** Thông tin người mua gửi lên khi bấm đặt hàng. */
public record CheckoutRequest(
        // Cột trong cơ sở dữ liệu chỉ chứa 500 ký tự nên phải giới hạn từ đây
        @NotBlank(message = "Địa chỉ giao hàng không được để trống") //
        @Size(max = 500, message = "Địa chỉ giao hàng tối đa 500 ký tự") String shippingAddress,

        @NotNull(message = "Hãy chọn phương thức thanh toán") PaymentMethod paymentMethod,

        String voucherCode) {
}
