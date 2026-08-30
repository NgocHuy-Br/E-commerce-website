package auth_service.security;

import auth_service.entity.Role;

public record AuthPrincipal(Long userId, String email, Role role) {
}
