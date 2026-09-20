package auth_service.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import auth_service.dto.AccountResponse;
import auth_service.entity.Account;
import auth_service.entity.Role;
import auth_service.repository.AccountRepository;
import auth_service.security.JwtService;
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

/** Kiểm tra quy tắc phân quyền: quản trị viên là tài khoản nội bộ, không mua và không bán. */
@ExtendWith(MockitoExtension.class)
class AuthServiceRoleTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    private Account account() {
        return new Account("nguoidung@nhom14.vn", "hashed");
    }

    @Test
    @DisplayName("Cấp quyền quản trị thì tự bỏ quyền mua và bán")
    void grantingAdminRemovesCustomerRoles() {
        Account account = account();
        account.addRole(Role.SELLER);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));

        AccountResponse response = authService.updateRoles(1L, Set.of(Role.ADMIN, Role.BUYER, Role.SELLER));

        assertThat(response.roles()).containsExactly(Role.ADMIN);
    }

    @Test
    @DisplayName("Tài khoản khách luôn giữ quyền mua hàng làm nền")
    void customerAlwaysKeepsBuyerRole() {
        Account account = account();
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));

        AccountResponse response = authService.updateRoles(1L, Set.of(Role.SELLER));

        assertThat(response.roles()).containsExactlyInAnyOrder(Role.BUYER, Role.SELLER);
    }

    @Test
    @DisplayName("Bỏ quyền người bán thì tài khoản chỉ còn quyền mua hàng")
    void removingSellerRoleKeepsBuyer() {
        Account account = account();
        account.addRole(Role.SELLER);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));

        AccountResponse response = authService.updateRoles(1L, Set.of(Role.BUYER));

        assertThat(response.roles()).containsExactly(Role.BUYER);
    }

    @Test
    @DisplayName("Tài khoản quản trị không thể được cấp quyền người bán")
    void adminCannotBecomeSeller() {
        Account account = account();
        account.replaceRoles(Set.of(Role.ADMIN));
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));

        assertThatThrownBy(() -> authService.grantSellerRole(1L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("quản trị viên không thể trở thành người bán");
    }
}
