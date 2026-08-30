package auth_service.dto;

import auth_service.entity.Role;

public record AuthResponse(
        String accessToken,
        String tokenType,
        Long userId,
        String email,
        Role role) {
}
