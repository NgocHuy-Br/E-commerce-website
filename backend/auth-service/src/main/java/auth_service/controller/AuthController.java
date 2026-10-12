package auth_service.controller;

import auth_service.dto.AuthResponse;
import auth_service.dto.AccountResponse;
import auth_service.dto.AccountRolesRequest;
import auth_service.dto.AccountStatusRequest;
import auth_service.dto.CurrentUserResponse;
import auth_service.dto.AccountStatsResponse;
import auth_service.dto.LoginRequest;
import auth_service.dto.PasswordChangeRequest;
import auth_service.dto.RegisterRequest;
import auth_service.security.AuthPrincipal;
import auth_service.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import java.util.List;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final auth_service.service.PasswordResetService passwordResetService;

    public AuthController(AuthService authService, auth_service.service.PasswordResetService passwordResetService) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public CurrentUserResponse me(@AuthenticationPrincipal AuthPrincipal principal) {
        return new CurrentUserResponse(principal.userId(), principal.email(), principal.roles());
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@AuthenticationPrincipal AuthPrincipal principal) {
        return authService.refresh(principal.userId());
    }

    @PostMapping("/forgot-password")
    public auth_service.dto.ForgotPasswordResponse forgotPassword(
            @Valid @RequestBody auth_service.dto.ForgotPasswordRequest request) {
        return passwordResetService.requestReset(request.email());
    }

    @PostMapping("/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@Valid @RequestBody auth_service.dto.ResetPasswordRequest request) {
        passwordResetService.reset(request);
    }

    @PutMapping("/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody PasswordChangeRequest request) {
        authService.changePassword(principal.userId(), request);
    }

    @GetMapping("/admin/statistics")
    @PreAuthorize("hasRole('ADMIN')")
    public AccountStatsResponse getStatistics() {
        return authService.getStatistics();
    }

    @GetMapping("/admin/accounts")
    @PreAuthorize("hasRole('ADMIN')")
    public List<AccountResponse> getAccounts() {
        return authService.getAccounts();
    }

    @PutMapping("/admin/accounts/{accountId}/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public AccountResponse updateRoles(@PathVariable Long accountId, @Valid @RequestBody AccountRolesRequest request) {
        return authService.updateRoles(accountId, request.roles());
    }

    @PutMapping("/admin/accounts/{accountId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public AccountResponse updateStatus(@PathVariable Long accountId,
            @Valid @RequestBody AccountStatusRequest request) {
        return authService.updateStatus(accountId, request.status(), request.reason());
    }

    @PatchMapping("/admin/accounts/{accountId}/seller-role")
    @PreAuthorize("hasRole('ADMIN')")
    public AccountResponse grantSellerRole(@PathVariable Long accountId) {
        return authService.grantSellerRole(accountId);
    }
}
