package order_service.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class VoucherTest {

    private Voucher newVoucher(int remainingUses) {
        return new Voucher("NHOM14", 10, new BigDecimal("500000"), remainingUses,
                Instant.now().minus(1, ChronoUnit.HOURS), Instant.now().plus(7, ChronoUnit.DAYS));
    }

    @Test
    @DisplayName("Mỗi lần dùng giảm một lượt")
    void useDecreasesRemainingUses() {
        Voucher voucher = newVoucher(3);

        voucher.use();

        assertThat(voucher.getRemainingUses()).isEqualTo(2);
    }

    @Test
    @DisplayName("Hết lượt thì không dùng được nữa")
    void useRejectsWhenExhausted() {
        Voucher voucher = newVoucher(0);

        assertThatThrownBy(voucher::use).isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("Huỷ đơn thì lượt dùng được hoàn lại")
    void restoreGivesBackOneUse() {
        Voucher voucher = newVoucher(5);
        voucher.use();

        voucher.restore();

        assertThat(voucher.getRemainingUses()).isEqualTo(5);
    }
}
