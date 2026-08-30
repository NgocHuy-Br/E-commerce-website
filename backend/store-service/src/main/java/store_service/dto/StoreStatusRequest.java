package store_service.dto;

import jakarta.validation.constraints.NotNull;
import store_service.entity.StoreStatus;

public record StoreStatusRequest(@NotNull StoreStatus status) {
}
