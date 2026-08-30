package auth_service.dto;

import auth_service.entity.AccountStatus;
import auth_service.entity.Role;
import java.util.Set;

public record AccountResponse(Long id, String email, Set<Role> roles, AccountStatus status) {
}