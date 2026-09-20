package auth_service.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class LoginAttemptServiceTest {

    @Test
    @DisplayName("Dưới năm lần sai thì vẫn được thử tiếp")
    void allowsAttemptsBelowLimit() {
        LoginAttemptService service = new LoginAttemptService();

        for (int i = 0; i < 4; i++) {
            service.recordFailure("a@nhom14.vn");
        }

        assertThatCode(() -> service.ensureNotBlocked("a@nhom14.vn")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Sai năm lần thì bị chặn tạm thời")
    void blocksAfterFiveFailures() {
        LoginAttemptService service = new LoginAttemptService();

        for (int i = 0; i < 5; i++) {
            service.recordFailure("b@nhom14.vn");
        }

        assertThatThrownBy(() -> service.ensureNotBlocked("b@nhom14.vn"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("sai quá nhiều lần");
    }

    @Test
    @DisplayName("Đăng nhập thành công thì xoá bộ đếm sai")
    void successResetsCounter() {
        LoginAttemptService service = new LoginAttemptService();
        for (int i = 0; i < 5; i++) {
            service.recordFailure("c@nhom14.vn");
        }

        service.recordSuccess("c@nhom14.vn");

        assertThatCode(() -> service.ensureNotBlocked("c@nhom14.vn")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Bộ đếm của mỗi email là độc lập")
    void countersAreIsolatedPerEmail() {
        LoginAttemptService service = new LoginAttemptService();
        for (int i = 0; i < 5; i++) {
            service.recordFailure("d@nhom14.vn");
        }

        assertThatCode(() -> service.ensureNotBlocked("e@nhom14.vn")).doesNotThrowAnyException();
    }
}
