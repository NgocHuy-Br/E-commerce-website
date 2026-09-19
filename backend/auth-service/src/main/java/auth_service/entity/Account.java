package auth_service.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.EnumSet;
import java.util.Set;

@Entity
@Table(name = "accounts")
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 120)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private Role legacyRole;

    @ElementCollection(targetClass = Role.class)
    @Enumerated(EnumType.STRING)
    @CollectionTable(name = "account_roles", joinColumns = @jakarta.persistence.JoinColumn(name = "account_id"))
    @Column(name = "role", nullable = false, length = 20)
    private Set<Role> roles = EnumSet.noneOf(Role.class);

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AccountStatus status;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected Account() {
    }

    public Account(String email, String passwordHash) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.legacyRole = Role.BUYER;
        this.roles.add(Role.BUYER);
        this.status = AccountStatus.ACTIVE;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void changePassword(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public Set<Role> getRoles() {
        if (roles.isEmpty()) {
            return legacyRole == Role.BUYER ? Set.of(Role.BUYER) : Set.of(Role.BUYER, legacyRole);
        }
        return Set.copyOf(roles);
    }

    public void addRole(Role role) {
        roles.add(role);
    }

    /** Thay toàn bộ quyền của tài khoản (dùng khi quản trị viên phân quyền lại). */
    public void replaceRoles(Set<Role> newRoles) {
        roles.clear();
        roles.addAll(newRoles);
        // Cột role cũ vẫn NOT NULL nên giữ một giá trị đại diện.
        legacyRole = newRoles.contains(Role.ADMIN) ? Role.ADMIN
                : newRoles.contains(Role.SELLER) ? Role.SELLER : Role.BUYER;
    }

    public boolean isAdmin() {
        return getRoles().contains(Role.ADMIN);
    }

    public AccountStatus getStatus() {
        return status;
    }

    public void setStatus(AccountStatus status) {
        this.status = status;
    }
}
