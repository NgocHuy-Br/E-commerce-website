package auth_service.controller;

import auth_service.dto.AuthResponse;
import auth_service.dto.AccountResponse;
import auth_service.dto.AccountRolesRequest;
import auth_service.dto.AccountStatusRequest;
import auth_service.dto.CurrentUserResponse;
import auth_service.dto.LoginRequest;
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
import java.util.List;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
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
        return authService.updateStatus(accountId, request.status());
    }
}
