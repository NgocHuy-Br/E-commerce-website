package auth_service.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import auth_service.dto.AccountStatsResponse;
import auth_service.dto.LoginRequest;
import auth_service.dto.PasswordChangeRequest;
import auth_service.dto.RegisterRequest;
import auth_service.entity.Account;
import auth_service.entity.AccountStatus;
import auth_service.entity.Role;
import auth_service.repository.AccountRepository;
import auth_service.security.JwtService;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

/** Kiểm tra nghiệp vụ đăng ký, đăng nhập, đổi mật khẩu và thống kê tài khoản. */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    private Account account() {
        return new Account("nguoimua@nhom14.vn", "bam-cu");
    }

    @Test
    @DisplayName("Đăng ký với email đã tồn tại thì báo lỗi trùng")
    void registerRejectsDuplicateEmail() {
        when(accountRepository.existsByEmail("nguoimua@nhom14.vn")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(new RegisterRequest("nguoimua@nhom14.vn", "matkhau123")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("đã được đăng ký");
    }

    @Test
    @DisplayName("Tài khoản bị khoá thì không đăng nhập được")
    void loginRejectsLockedAccount() {
        Account locked = account();
        locked.setStatus(AccountStatus.LOCKED);
        when(accountRepository.findByEmail("nguoimua@nhom14.vn")).thenReturn(Optional.of(locked));
        when(passwordEncoder.matches("matkhau123", "bam-cu")).thenReturn(true);

        assertThatThrownBy(() -> authService.login(new LoginRequest("nguoimua@nhom14.vn", "matkhau123")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("đã bị khoá");
    }

    @Test
    @DisplayName("Đổi mật khẩu sai mật khẩu hiện tại thì bị từ chối")
    void changePasswordRejectsWrongCurrentPassword() {
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account()));
        when(passwordEncoder.matches("sai", "bam-cu")).thenReturn(false);

        assertThatThrownBy(() -> authService.changePassword(1L, new PasswordChangeRequest("sai", "matkhaumoi")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Mật khẩu hiện tại không đúng");
    }

    @Test
    @DisplayName("Mật khẩu mới trùng mật khẩu cũ thì bị từ chối")
    void changePasswordRejectsSamePassword() {
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account()));
        when(passwordEncoder.matches("matkhaucu", "bam-cu")).thenReturn(true);

        assertThatThrownBy(() -> authService.changePassword(1L, new PasswordChangeRequest("matkhaucu", "matkhaucu")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("phải khác mật khẩu hiện tại");
    }

    @Test
    @DisplayName("Đổi mật khẩu đúng thì lưu chuỗi băm mới")
    void changePasswordStoresNewHash() {
        Account account = account();
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
        when(passwordEncoder.matches("matkhaucu", "bam-cu")).thenReturn(true);
        when(passwordEncoder.matches("matkhaumoi", "bam-cu")).thenReturn(false);
        when(passwordEncoder.encode("matkhaumoi")).thenReturn("bam-moi");

        authService.changePassword(1L, new PasswordChangeRequest("matkhaucu", "matkhaumoi"));

        assertThat(account.getPasswordHash()).isEqualTo("bam-moi");
    }

    @Test
    @DisplayName("Thống kê đếm đúng số tài khoản theo quyền và trạng thái")
    void statisticsCountAccounts() {
        Account buyer = account();
        Account seller = new Account("nguoiban@nhom14.vn", "bam");
        seller.addRole(Role.SELLER);
        Account admin = new Account("quantri@nhom14.vn", "bam");
        admin.replaceRoles(Set.of(Role.ADMIN));
        Account locked = new Account("bikhoa@nhom14.vn", "bam");
        locked.setStatus(AccountStatus.LOCKED);
        when(accountRepository.findAll()).thenReturn(List.of(buyer, seller, admin, locked));

        AccountStatsResponse stats = authService.getStatistics();

        assertThat(stats.totalAccounts()).isEqualTo(4);
        assertThat(stats.activeAccounts()).isEqualTo(3);
        assertThat(stats.lockedAccounts()).isEqualTo(1);
        assertThat(stats.sellers()).isEqualTo(1);
        assertThat(stats.admins()).isEqualTo(1);
        assertThat(stats.buyers()).isEqualTo(3);
    }
}
