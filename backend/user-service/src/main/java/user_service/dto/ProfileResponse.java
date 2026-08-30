package user_service.dto;

public record ProfileResponse(
        Long userId,
        String email,
        String fullName,
        String phoneNumber,
        String avatarUrl) {
}
