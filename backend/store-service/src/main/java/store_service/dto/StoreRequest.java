package store_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Thông tin cửa hàng người bán tự khai báo. */
public record StoreRequest(
        @NotBlank(message = "Tên cửa hàng không được để trống") //
        @Pattern(regexp = "^[\\p{L}\\p{N} .,\\-_/&+()]{2,120}$",
                message = "Tên cửa hàng không được chứa ký tự đặc biệt") String name,

        @Size(max = 1000, message = "Giới thiệu tối đa 1000 ký tự") String description,

        @NotBlank(message = "Địa chỉ cửa hàng không được để trống") //
        @Pattern(regexp = "^[\\p{L}\\p{N} .,\\-/]{5,255}$",
                message = "Địa chỉ không được chứa ký tự đặc biệt") String address,

        @NotBlank(message = "Số điện thoại không được để trống") //
        @Pattern(regexp = "^0\\d{9}$",
                message = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0") String phoneNumber,

        @Pattern(regexp = "^$|^https?://\\S+$",
                message = "Logo phải là đường dẫn bắt đầu bằng http:// hoặc https://") //
        @Size(max = 500, message = "Đường dẫn logo tối đa 500 ký tự") String logoUrl) {
}
