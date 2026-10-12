package auth_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "Email không được để trống") String email,
        @NotBlank(message = "Hãy nhập mã xác nhận") @Pattern(regexp = "\\d{6}", message = "Mã xác nhận gồm 6 chữ số") String code,
        @NotBlank(message = "Mật khẩu không được để trống") @Size(min = 6, max = 72, message = "Mật khẩu phải từ 6 đến 72 ký tự") String newPassword) {
}
