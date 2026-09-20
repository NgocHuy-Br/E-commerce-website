package user_service.dto;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Kiểm tra ràng buộc của địa chỉ giao hàng. */
class AddressRequestValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private List<String> errorsOf(AddressRequest request) {
        return validator.validate(request).stream().map(ConstraintViolation::getMessage).toList();
    }

    private AddressRequest address(String recipientName, String phone, String detail) {
        return new AddressRequest(recipientName, phone, detail, "Phường Thượng Đình", "Quận Thanh Xuân",
                "Hà Nội", false);
    }

    @Test
    @DisplayName("Địa chỉ đầy đủ và đúng định dạng thì không có lỗi")
    void validAddressHasNoError() {
        assertThat(errorsOf(address("Nguyễn Văn Mua", "0987654321", "Số 5 ngõ 12 Nguyễn Trãi"))).isEmpty();
    }

    @Test
    @DisplayName("Địa chỉ có ngoặc đơn hoặc dấu cộng vẫn hợp lệ")
    void addressWithBracketsAndPlusIsAccepted() {
        assertThat(errorsOf(address("Nguyễn Văn Mua", "0987654321", "Km 9+200 (cạnh Vincom)"))).isEmpty();
    }

    @Test
    @DisplayName("Tên người nhận có số thì báo lỗi")
    void recipientNameWithDigitsIsRejected() {
        assertThat(errorsOf(address("Nguyen Van 123", "0987654321", "Số 5")))
                .anyMatch(message -> message.contains("chỉ gồm chữ và dấu cách"));
    }

    @Test
    @DisplayName("Số điện thoại có chữ hoặc thiếu số thì báo lỗi")
    void invalidPhoneIsRejected() {
        assertThat(errorsOf(address("Nguyễn Văn Mua", "09abc", "Số 5")))
                .anyMatch(message -> message.contains("10 chữ số"));
        assertThat(errorsOf(address("Nguyễn Văn Mua", "0912", "Số 5")))
                .anyMatch(message -> message.contains("10 chữ số"));
    }

    @Test
    @DisplayName("Địa chỉ chứa ký tự lạ thì báo lỗi")
    void addressWithStrangeCharacterIsRejected() {
        assertThat(errorsOf(address("Nguyễn Văn Mua", "0987654321", "Số 5 <script>")))
                .anyMatch(message -> message.contains("không được phép"));
    }
}
