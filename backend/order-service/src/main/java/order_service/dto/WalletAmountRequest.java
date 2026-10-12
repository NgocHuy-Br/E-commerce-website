package order_service.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;

/** Dùng chung cho nạp và rút tiền. */
public record WalletAmountRequest(
        @NotNull(message = "Hãy nhập số tiền") @DecimalMin(value = "10000", message = "Số tiền tối thiểu là 10.000đ") @DecimalMax(value = "50000000", message = "Số tiền tối đa mỗi lần là 50.000.000đ") BigDecimal amount,

        @NotNull(message = "Hãy chọn phương thức") @Pattern(regexp = "VNPAY|MOMO|BANK_TRANSFER", message = "Phương thức không hợp lệ") String method) {
}
