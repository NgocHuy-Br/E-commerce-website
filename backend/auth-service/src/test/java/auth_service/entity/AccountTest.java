package auth_service.entity;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Kiểm tra các quy tắc nằm trong chính thực thể Account. */
class AccountTest {

    private Account newAccount() {
        return new Account("nguoimua@nhom14.vn", "mat-khau-da-bam");
    }

    @Test
    @DisplayName("Tài khoản mới luôn là người mua và đang hoạt động")
    void newAccountIsActiveBuyer() {
        Account account = newAccount();

        assertThat(account.getRoles()).containsExactly(Role.BUYER);
        assertThat(account.getStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(account.isAdmin()).isFalse();
    }

    @Test
    @DisplayName("Thêm quyền người bán thì tài khoản có cả hai quyền")
    void addSellerRole() {
        Account account = newAccount();

        account.addRole(Role.SELLER);

        assertThat(account.getRoles()).containsExactlyInAnyOrder(Role.BUYER, Role.SELLER);
    }

    @Test
    @DisplayName("Thay toàn bộ quyền bằng quyền quản trị thì chỉ còn quyền quản trị")
    void replaceRolesWithAdmin() {
        Account account = newAccount();
        account.addRole(Role.SELLER);

        account.replaceRoles(Set.of(Role.ADMIN));

        assertThat(account.getRoles()).containsExactly(Role.ADMIN);
        assertThat(account.isAdmin()).isTrue();
    }

    @Test
    @DisplayName("Đổi mật khẩu thì lưu lại chuỗi băm mới")
    void changePasswordStoresNewHash() {
        Account account = newAccount();

        account.changePassword("bam-moi");

        assertThat(account.getPasswordHash()).isEqualTo("bam-moi");
    }

    @Test
    @DisplayName("Quản trị viên khoá tài khoản thì trạng thái chuyển sang LOCKED")
    void lockAccount() {
        Account account = newAccount();

        account.setStatus(AccountStatus.LOCKED);

        assertThat(account.getStatus()).isEqualTo(AccountStatus.LOCKED);
    }
}
