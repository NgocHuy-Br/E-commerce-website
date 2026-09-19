package order_service.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record VoucherResponse(Long id, String code, int discountPercent, BigDecimal minimumOrderAmount,
        int remainingUses, Instant startsAt, Instant endsAt) {
}
