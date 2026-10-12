package order_service.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CommissionRequest(
        @NotNull(message = "Thiếu tỷ lệ phí nền tảng") @DecimalMin(value = "0", message = "Phí nền tảng không được âm") @DecimalMax(value = "50", message = "Phí nền tảng tối đa 50%") BigDecimal commissionPercent) {
}
