package user_service.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Thông tin cá nhân người dùng tự sửa. Các trường đều không bắt buộc,
 * nhưng nếu có nhập thì phải đúng định dạng.
 */
public record ProfileUpdateRequest(
        // Chỉ cho chữ và dấu cách, không cho số hay ký tự đặc biệt
        @Pattern(regexp = "^$|^[\\p{L} ]{2,100}$",
                message = "Họ tên chỉ gồm chữ và dấu cách, từ 2 đến 100 ký tự") //
        @Size(max = 100, message = "Họ tên tối đa 100 ký tự") String fullName,

        // Số điện thoại Việt Nam: 10 chữ số, bắt đầu bằng 0
        @Pattern(regexp = "^$|^0\\d{9}$",
                message = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0") String phoneNumber,

        @Pattern(regexp = "^$|^https?://\\S+$",
                message = "Ảnh đại diện phải là đường dẫn bắt đầu bằng http:// hoặc https://") //
        @Size(max = 500, message = "Đường dẫn ảnh tối đa 500 ký tự") String avatarUrl) {
}
