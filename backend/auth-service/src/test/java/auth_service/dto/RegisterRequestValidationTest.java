package auth_service.dto;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Kiểm tra các ràng buộc khai báo trên DTO đăng ký. */
class RegisterRequestValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private List<String> errorsOf(RegisterRequest request) {
        return validator.validate(request).stream().map(ConstraintViolation::getMessage).toList();
    }

    @Test
    @DisplayName("Email và mật khẩu hợp lệ thì không có lỗi")
    void validRequestHasNoError() {
        assertThat(errorsOf(new RegisterRequest("nguoimua@nhom14.vn", "matkhau123"))).isEmpty();
    }

    @Test
    @DisplayName("Email sai định dạng thì báo lỗi")
    void invalidEmailIsRejected() {
        assertThat(errorsOf(new RegisterRequest("khong-phai-email", "matkhau123")))
                .contains("Email không đúng định dạng");
    }

    @Test
    @DisplayName("Mật khẩu ngắn hơn 6 ký tự thì báo lỗi")
    void shortPasswordIsRejected() {
        assertThat(errorsOf(new RegisterRequest("nguoimua@nhom14.vn", "123")))
                .contains("Mật khẩu phải từ 6 đến 72 ký tự");
    }

    @Test
    @DisplayName("Email có khoảng trắng ở đầu và cuối vẫn dùng được vì đã được cắt sẵn")
    void emailWithSpacesIsTrimmed() {
        RegisterRequest request = new RegisterRequest("  nguoimua@nhom14.vn  ", "matkhau123");

        assertThat(request.email()).isEqualTo("nguoimua@nhom14.vn");
        assertThat(errorsOf(request)).isEmpty();
    }
}
