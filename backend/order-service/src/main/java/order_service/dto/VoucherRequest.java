package order_service.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.time.Instant;

/** Mã giảm giá do quản trị viên tạo cho cả sàn. */
public record VoucherRequest(
        // Mã chỉ gồm chữ và số, không dấu cách, không ký tự đặc biệt
        @NotBlank(message = "Mã giảm giá không được để trống") //
        @Pattern(regexp = "^[A-Za-z0-9]{3,20}$",
                message = "Mã giảm giá chỉ gồm chữ và số, từ 3 đến 20 ký tự") String code,

        @Min(value = 1, message = "Phần trăm giảm phải từ 1 đến 90") //
        @Max(value = 90, message = "Phần trăm giảm phải từ 1 đến 90") int discountPercent,

        @NotNull(message = "Giá trị đơn tối thiểu không được để trống") //
        @PositiveOrZero(message = "Giá trị đơn tối thiểu phải là số không âm") //
        @DecimalMax(value = "999999999", message = "Giá trị đơn tối thiểu tối đa 999.999.999đ") //
        BigDecimal minimumOrderAmount,

        @Positive(message = "Số lượt dùng phải là số lớn hơn 0") //
        @Max(value = 10000, message = "Số lượt dùng tối đa 10.000") int remainingUses,

        @NotNull(message = "Hãy chọn thời gian bắt đầu") Instant startsAt,

        @NotNull(message = "Hãy chọn thời gian kết thúc") Instant endsAt) {
}
