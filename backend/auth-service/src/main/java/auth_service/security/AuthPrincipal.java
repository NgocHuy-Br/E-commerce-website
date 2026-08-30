package auth_service.security;

import auth_service.entity.Role;
import java.util.Set;

public record AuthPrincipal(Long userId, String email, Set<Role> roles) {
}
