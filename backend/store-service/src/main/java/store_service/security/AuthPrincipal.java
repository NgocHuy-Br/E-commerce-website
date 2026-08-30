package store_service.security;

import java.util.Set;

public record AuthPrincipal(Long userId, String email, Set<String> roles) {
}
