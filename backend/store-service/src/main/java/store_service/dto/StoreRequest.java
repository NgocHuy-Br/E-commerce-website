package store_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Thông tin cửa hàng người bán tự khai báo. */
public record StoreRequest(
        @NotBlank(message = "Tên cửa hàng không được để trống") //
        @Pattern(regexp = "^[\\p{L}\\p{N} .,\\-_/&+()%:'\"#!?]{2,120}$",
                message = "Tên cửa hàng chứa ký tự không được phép") String name,

        @Size(max = 1000, message = "Giới thiệu tối đa 1000 ký tự") String description,

        @NotBlank(message = "Địa chỉ cửa hàng không được để trống") //
        // Địa chỉ thật hay có ngoặc đơn, dấu + và #, ví dụ: Km 9+200, Toà A1 (cạnh Vincom)
        @Pattern(regexp = "^[\\p{L}\\p{N} .,\\-/()+#:]{5,255}$",
                message = "Địa chỉ chứa ký tự không được phép") String address,

        @NotBlank(message = "Số điện thoại không được để trống") //
        // Số di động 10 chữ số bắt đầu bằng 0, hoặc hotline dạng 1900xxxx / 1800xxxx
        @Pattern(regexp = "^(0\\d{9}|1[89]00\\d{4,6})$",
                message = "Số điện thoại phải là 10 chữ số bắt đầu bằng 0, hoặc hotline 1900/1800") //
        String phoneNumber,

        @Pattern(regexp = "^$|^https?://\\S+$",
                message = "Logo phải là đường dẫn bắt đầu bằng http:// hoặc https://") //
        @Size(max = 500, message = "Đường dẫn logo tối đa 500 ký tự") String logoUrl) {
}
