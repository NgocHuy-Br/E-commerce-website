package order_service.dto;

import jakarta.validation.constraints.Size;

public record WithdrawalDecisionRequest(boolean approve,
        @Size(max = 255, message = "Ghi chú tối đa 255 ký tự") String note) {
}
