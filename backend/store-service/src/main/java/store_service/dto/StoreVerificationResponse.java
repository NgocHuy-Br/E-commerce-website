package store_service.dto;

import store_service.entity.StoreStatus;

public record StoreVerificationResponse(Long id, Long ownerId, StoreStatus status) {
}