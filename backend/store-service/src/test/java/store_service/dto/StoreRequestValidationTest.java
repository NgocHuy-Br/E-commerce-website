package store_service.dto;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Kiểm tra ràng buộc của thông tin cửa hàng. */
class StoreRequestValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private List<String> errorsOf(StoreRequest request) {
        return validator.validate(request).stream().map(ConstraintViolation::getMessage).toList();
    }

    private StoreRequest store(String name, String phone) {
        return new StoreRequest(name, "Mô tả", "12 Trần Phú, Hà Đông", phone, null);
    }

    @Test
    @DisplayName("Thông tin cửa hàng hợp lệ thì không có lỗi")
    void validStoreHasNoError() {
        assertThat(errorsOf(store("Shop Công Nghệ 14", "0901234567"))).isEmpty();
    }

    @Test
    @DisplayName("Cửa hàng được dùng số hotline 1900")
    void hotlineIsAccepted() {
        assertThat(errorsOf(store("Shop Công Nghệ 14", "19001234"))).isEmpty();
    }

    @Test
    @DisplayName("Số điện thoại quá ngắn thì báo lỗi")
    void shortPhoneIsRejected() {
        assertThat(errorsOf(store("Shop Công Nghệ 14", "123")))
                .anyMatch(message -> message.contains("10 chữ số"));
    }

    @Test
    @DisplayName("Tên cửa hàng chứa thẻ script thì báo lỗi")
    void nameWithScriptTagIsRejected() {
        assertThat(errorsOf(store("Shop <script>", "0901234567")))
                .anyMatch(message -> message.contains("không được phép"));
    }

    @Test
    @DisplayName("Logo không phải đường dẫn http thì báo lỗi")
    void invalidLogoUrlIsRejected() {
        StoreRequest request = new StoreRequest("Shop Công Nghệ", "Mô tả", "12 Trần Phú", "0901234567",
                "logo.png");

        assertThat(errorsOf(request)).anyMatch(message -> message.contains("http://"));
    }
}
