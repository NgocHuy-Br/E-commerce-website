package auth_service.dto;

import auth_service.entity.Role;
import java.util.Set;

public record CurrentUserResponse(Long userId, String email, Set<Role> roles) {
}
