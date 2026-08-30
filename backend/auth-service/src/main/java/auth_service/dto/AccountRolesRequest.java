package auth_service.dto;

import auth_service.entity.Role;
import jakarta.validation.constraints.NotEmpty;
import java.util.Set;

public record AccountRolesRequest(@NotEmpty Set<Role> roles) {
}