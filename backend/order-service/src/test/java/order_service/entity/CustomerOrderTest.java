package order_service.entity;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CustomerOrderTest {

    private CustomerOrder newOrder(PaymentMethod method) {
        return new CustomerOrder(1L, 1L, "Số 5 Nguyễn Trãi, Hà Nội", method);
    }

    @Test
    @DisplayName("Đơn COD chờ thanh toán, đơn trả trước ghi nhận đã thanh toán ngay")
    void paymentStatusDependsOnMethod() {
        assertThat(newOrder(PaymentMethod.COD).getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(newOrder(PaymentMethod.BANK_TRANSFER).getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(newOrder(PaymentMethod.MOMO).getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
    }

    @Test
    @DisplayName("Đơn mới luôn ở trạng thái chờ xác nhận và tổng tiền bằng không")
    void newOrderStartsPending() {
        CustomerOrder order = newOrder(PaymentMethod.COD);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PENDING);
        assertThat(order.getTotalAmount()).isEqualByComparingTo("0");
        assertThat(order.getItems()).isEmpty();
    }

    @Test
    @DisplayName("Thêm sản phẩm thì tổng tiền cộng dồn theo giá nhân số lượng")
    void addItemAccumulatesTotal() {
        CustomerOrder order = newOrder(PaymentMethod.COD);

        order.addItem(new OrderItem(order, 1L, 1L, "Tai nghe", new BigDecimal("712000"), 1));
        order.addItem(new OrderItem(order, 3L, 1L, "Bình giữ nhiệt", new BigDecimal("250000"), 2));

        assertThat(order.getItems()).hasSize(2);
        assertThat(order.getTotalAmount()).isEqualByComparingTo("1212000");
    }

    @Test
    @DisplayName("Áp mã giảm 10% thì trừ đúng số tiền và lưu lại mã đã dùng")
    void applyVoucherReducesTotal() {
        CustomerOrder order = newOrder(PaymentMethod.COD);
        order.addItem(new OrderItem(order, 1L, 1L, "Tai nghe", new BigDecimal("712000"), 1));
        order.addItem(new OrderItem(order, 3L, 1L, "Bình giữ nhiệt", new BigDecimal("250000"), 2));

        order.applyVoucher(new Voucher("NHOM14", 10, BigDecimal.ZERO, 5,
                Instant.now().minus(1, ChronoUnit.HOURS), Instant.now().plus(1, ChronoUnit.DAYS)));

        assertThat(order.getDiscountAmount()).isEqualByComparingTo("121200");
        assertThat(order.getTotalAmount()).isEqualByComparingTo("1090800");
        assertThat(order.getVoucherCode()).isEqualTo("NHOM14");
    }
}
