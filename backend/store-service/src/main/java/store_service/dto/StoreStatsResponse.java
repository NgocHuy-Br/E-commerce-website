package store_service.dto;

public record StoreStatsResponse(
        long totalStores,
        long pendingStores,
        long activeStores,
        long rejectedStores,
        long suspendedStores) {
}
