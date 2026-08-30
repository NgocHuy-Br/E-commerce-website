package store_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StoreRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 1000) String description,
        @NotBlank @Size(max = 255) String address,
        @NotBlank @Size(max = 20) String phoneNumber,
        @Size(max = 500) String logoUrl) {
}
