package auth_service.service;

import auth_service.dto.ForgotPasswordResponse;
import auth_service.dto.ResetPasswordRequest;
import auth_service.entity.Account;
import auth_service.entity.AccountStatus;
import auth_service.repository.AccountRepository;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Đặt lại mật khẩu bằng mã 6 số có hạn dùng; chưa có dịch vụ email nên mã được
 * ghi log (và trả về khi bật chế độ dev).
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final Duration CODE_LIFETIME = Duration.ofMinutes(10);
    private static final int MAX_ATTEMPTS = 5;
    private static final String GENERIC_MESSAGE = "Nếu email tồn tại, mã xác nhận đã được tạo và có hiệu lực 10 phút";

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final boolean exposeResetCode;
    private final SecureRandom random = new SecureRandom();

    public PasswordResetService(AccountRepository accountRepository, PasswordEncoder passwordEncoder,
            @Value("${app.auth.expose-reset-code:true}") boolean exposeResetCode) {
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
        this.exposeResetCode = exposeResetCode;
    }

    @Transactional
    public ForgotPasswordResponse requestReset(String email) {
        return accountRepository.findByEmail(normalize(email)).filter(a -> a.getStatus() == AccountStatus.ACTIVE)
                .map(account -> {
                    String code = String.format("%06d", random.nextInt(1_000_000));
                    account.startPasswordReset(passwordEncoder.encode(code), Instant.now().plus(CODE_LIFETIME));
                    log.info("Mã đặt lại mật khẩu cho {}: {}", account.getEmail(), code);
                    return new ForgotPasswordResponse(GENERIC_MESSAGE, exposeResetCode ? code : null);
                }).orElseGet(() -> new ForgotPasswordResponse(GENERIC_MESSAGE, null));
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public void reset(ResetPasswordRequest request) {
        Account account = accountRepository.findByEmail(normalize(request.email()))
                .orElseThrow(this::invalidCode);
        if (account.getResetCodeHash() == null || account.getResetExpiresAt() == null
                || account.getResetExpiresAt().isBefore(Instant.now())
                || account.getResetAttempts() >= MAX_ATTEMPTS) {
            throw invalidCode();
        }
        if (!passwordEncoder.matches(request.code(), account.getResetCodeHash())) {
            account.recordFailedResetAttempt();
            throw invalidCode();
        }
        account.changePassword(passwordEncoder.encode(request.newPassword()));
        account.clearPasswordReset();
    }

    private ResponseStatusException invalidCode() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã xác nhận không đúng hoặc đã hết hạn");
    }

    private String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
