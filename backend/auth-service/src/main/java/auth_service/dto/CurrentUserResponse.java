package auth_service.dto;

import auth_service.entity.Role;

public record CurrentUserResponse(Long userId, String email, Role role) {
}
