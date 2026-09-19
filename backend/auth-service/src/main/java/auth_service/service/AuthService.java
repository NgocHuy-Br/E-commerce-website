package auth_service.service;

import auth_service.dto.AuthResponse;
import auth_service.dto.AccountResponse;
import auth_service.dto.AccountStatsResponse;
import auth_service.dto.LoginRequest;
import auth_service.dto.PasswordChangeRequest;
import auth_service.dto.RegisterRequest;
import auth_service.entity.Account;
import auth_service.entity.AccountStatus;
import auth_service.entity.Role;
import auth_service.repository.AccountRepository;
import auth_service.security.JwtService;
import java.util.Locale;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            AccountRepository accountRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (accountRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }

        Account account = accountRepository.save(new Account(
                email,
                passwordEncoder.encode(request.password())));
        return toAuthResponse(account);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        Account account = accountRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (account.getStatus() != AccountStatus.ACTIVE
                || !passwordEncoder.matches(request.password(), account.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        return toAuthResponse(account);
    }

    @Transactional
    public void changePassword(Long accountId, PasswordChangeRequest request) {
        Account account = findAccount(accountId);
        if (!passwordEncoder.matches(request.currentPassword(), account.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu hiện tại không đúng");
        }
        if (passwordEncoder.matches(request.newPassword(), account.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu mới phải khác mật khẩu hiện tại");
        }
        account.changePassword(passwordEncoder.encode(request.newPassword()));
    }

    @Transactional(readOnly = true)
    public AccountStatsResponse getStatistics() {
        List<Account> accounts = accountRepository.findAll();
        return new AccountStatsResponse(
                accounts.size(),
                accounts.stream().filter(account -> account.getStatus() == AccountStatus.ACTIVE).count(),
                accounts.stream().filter(account -> account.getStatus() == AccountStatus.LOCKED).count(),
                accounts.stream().filter(account -> account.getRoles().contains(Role.BUYER)).count(),
                accounts.stream().filter(account -> account.getRoles().contains(Role.SELLER)).count(),
                accounts.stream().filter(account -> account.getRoles().contains(Role.ADMIN)).count());
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> getAccounts() {
        return accountRepository.findAll().stream().map(this::toAccountResponse).toList();
    }

    @Transactional
    public AccountResponse updateRoles(Long accountId, Set<Role> roles) {
        Account account = findAccount(accountId);
        roles.forEach(account::addRole);
        account.getRoles().stream().filter(role -> role != Role.BUYER && !roles.contains(role))
                .forEach(account::removeRole);
        return toAccountResponse(account);
    }

    @Transactional
    public AccountResponse updateStatus(Long accountId, AccountStatus status) {
        Account account = findAccount(accountId);
        account.setStatus(status);
        return toAccountResponse(account);
    }

    @Transactional
    public AccountResponse grantSellerRole(Long accountId) {
        Account account = findAccount(accountId);
        account.addRole(Role.SELLER);
        return toAccountResponse(account);
    }

    private AuthResponse toAuthResponse(Account account) {
        return new AuthResponse(
                jwtService.generateToken(account),
                "Bearer",
                account.getId(),
                account.getEmail(),
                account.getRoles());
    }

    private AccountResponse toAccountResponse(Account account) {
        return new AccountResponse(account.getId(), account.getEmail(), account.getRoles(), account.getStatus());
    }

    private Account findAccount(Long accountId) {
        return accountRepository.findById(accountId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
