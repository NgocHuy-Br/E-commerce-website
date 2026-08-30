package user_service.dto;

import jakarta.validation.constraints.Size;

public record ProfileUpdateRequest(
        @Size(max = 100) String fullName,
        @Size(max = 20) String phoneNumber,
        @Size(max = 500) String avatarUrl) {
}
