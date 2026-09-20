package user_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Một địa chỉ giao hàng trong sổ địa chỉ của người mua. */
public record AddressRequest(
        @NotBlank(message = "Tên người nhận không được để trống") //
        @Pattern(regexp = "^[\\p{L} ]{2,100}$",
                message = "Tên người nhận chỉ gồm chữ và dấu cách, từ 2 đến 100 ký tự") String recipientName,

        @NotBlank(message = "Số điện thoại không được để trống") //
        @Pattern(regexp = "^0\\d{9}$",
                message = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0") String phoneNumber,

        // Địa chỉ cho phép chữ, số, dấu cách và các dấu thường dùng như . , - /
        @NotBlank(message = "Số nhà và tên đường không được để trống") //
        @Pattern(regexp = "^[\\p{L}\\p{N} .,\\-/]{2,255}$",
                message = "Số nhà và tên đường không được chứa ký tự đặc biệt") String detail,

        @NotBlank(message = "Phường/xã không được để trống") //
        @Pattern(regexp = "^[\\p{L}\\p{N} .,\\-/]{2,100}$",
                message = "Phường/xã không được chứa ký tự đặc biệt") String ward,

        @NotBlank(message = "Quận/huyện không được để trống") //
        @Pattern(regexp = "^[\\p{L}\\p{N} .,\\-/]{2,100}$",
                message = "Quận/huyện không được chứa ký tự đặc biệt") String district,

        @NotBlank(message = "Tỉnh/thành phố không được để trống") //
        @Pattern(regexp = "^[\\p{L}\\p{N} .,\\-/]{2,100}$",
                message = "Tỉnh/thành phố không được chứa ký tự đặc biệt") String city,

        boolean defaultAddress) {
}
