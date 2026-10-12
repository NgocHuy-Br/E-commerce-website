package order_service.dto;

import java.math.BigDecimal;

public record CommissionResponse(BigDecimal commissionPercent) {
}
