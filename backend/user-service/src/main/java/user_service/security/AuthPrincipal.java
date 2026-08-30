package user_service.security;

public record AuthPrincipal(Long userId, String email, String role) {
}
