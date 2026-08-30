package store_service.dto;

import store_service.entity.StoreStatus;

public record StoreResponse(
        Long id,
        Long ownerId,
        String name,
        String description,
        String address,
        String phoneNumber,
        String logoUrl,
        StoreStatus status) {
}
