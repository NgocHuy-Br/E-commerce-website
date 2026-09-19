package auth_service.dto;

public record AccountStatsResponse(
        long totalAccounts,
        long activeAccounts,
        long lockedAccounts,
        long buyers,
        long sellers,
        long admins) {
}
