package store_service.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import store_service.entity.StoreStatus;

public record StoreStatusRequest(@NotNull StoreStatus status,
        @Size(max = 500, message = "Lý do tối đa 500 ký tự") String reason) {
}
