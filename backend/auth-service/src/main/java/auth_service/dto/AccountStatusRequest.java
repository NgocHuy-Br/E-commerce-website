package auth_service.dto;

import auth_service.entity.AccountStatus;
import jakarta.validation.constraints.NotNull;

public record AccountStatusRequest(@NotNull AccountStatus status,
        @jakarta.validation.constraints.Size(max = 500, message = "Lý do tối đa 500 ký tự") String reason) {
}