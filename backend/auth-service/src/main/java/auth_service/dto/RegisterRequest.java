package auth_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Email không được để trống") @Email(message = "Email không đúng định dạng") String email,
        @NotBlank(message = "Mật khẩu không được để trống") @Size(min = 6, max = 72, message = "Mật khẩu phải từ 6 đến 72 ký tự") String password) {

    /** Cắt khoảng trắng trước khi validate để email dán từ nơi khác vẫn dùng được. */
    public RegisterRequest {
        email = email == null ? null : email.trim();
    }
}
