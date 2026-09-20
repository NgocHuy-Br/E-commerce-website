package order_service.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import order_service.dto.CheckoutRequest;
import order_service.dto.ReservedItem;
import order_service.entity.CustomerOrder;
import order_service.entity.PaymentMethod;
import order_service.entity.Voucher;
import order_service.repository.CustomerOrderRepository;
import order_service.repository.VoucherRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class OrderWriteServiceTest {

    @Mock
    private CustomerOrderRepository orderRepository;

    @Mock
    private VoucherRepository voucherRepository;

    @InjectMocks
    private OrderWriteService orderWriteService;

    private CheckoutRequest request(String voucherCode) {
        return new CheckoutRequest("Số 5 Nguyễn Trãi, Hà Nội", PaymentMethod.COD, voucherCode);
    }

    private Voucher voucher(int percent, String minimumOrderAmount) {
        return new Voucher("NHOM14", percent, new BigDecimal(minimumOrderAmount), 10,
                Instant.now().minus(1, ChronoUnit.HOURS), Instant.now().plus(7, ChronoUnit.DAYS));
    }

    @SuppressWarnings("unchecked")
    private void echoSavedOrders() {
        when(orderRepository.saveAll(anyList()))
                .thenAnswer(invocation -> (List<CustomerOrder>) invocation.getArgument(0));
    }

    @Test
    @DisplayName("Giỏ hàng một cửa hàng thì tạo đúng một đơn")
    void singleStoreCreatesOneOrder() {
        echoSavedOrders();
        List<ReservedItem> items = List.of(
                new ReservedItem(1L, 10L, "Tai nghe", new BigDecimal("700000"), 1),
                new ReservedItem(2L, 10L, "Chuột", new BigDecimal("300000"), 1));

        List<CustomerOrder> orders = orderWriteService.createOrders(1L, request(null), items);

        assertThat(orders).hasSize(1);
        assertThat(orders.get(0).getStoreId()).isEqualTo(10L);
        assertThat(orders.get(0).getTotalAmount()).isEqualByComparingTo("1000000");
    }

    @Test
    @DisplayName("Giỏ hàng nhiều cửa hàng được tách thành nhiều đơn theo từng cửa hàng")
    void multipleStoresSplitIntoSeparateOrders() {
        echoSavedOrders();
        List<ReservedItem> items = List.of(
                new ReservedItem(1L, 10L, "Tai nghe", new BigDecimal("700000"), 1),
                new ReservedItem(5L, 20L, "Áo thun", new BigDecimal("180000"), 2),
                new ReservedItem(2L, 10L, "Chuột", new BigDecimal("300000"), 1));

        List<CustomerOrder> orders = orderWriteService.createOrders(1L, request(null), items);

        assertThat(orders).hasSize(2);
        assertThat(orders).extracting(CustomerOrder::getStoreId).containsExactly(10L, 20L);
        assertThat(orders.get(0).getItems()).hasSize(2);
        assertThat(orders.get(0).getTotalAmount()).isEqualByComparingTo("1000000");
        assertThat(orders.get(1).getTotalAmount()).isEqualByComparingTo("360000");
    }

    @Test
    @DisplayName("Mã giảm 10% được áp cho từng đơn đã tách")
    void discountAppliesToEachOrder() {
        echoSavedOrders();
        when(voucherRepository.findByCodeForUpdate("NHOM14"))
                .thenReturn(Optional.of(voucher(10, "500000")));
        List<ReservedItem> items = List.of(
                new ReservedItem(1L, 10L, "Tai nghe", new BigDecimal("700000"), 1),
                new ReservedItem(5L, 20L, "Áo thun", new BigDecimal("300000"), 1));

        List<CustomerOrder> orders = orderWriteService.createOrders(1L, request("NHOM14"), items);

        // Mỗi đơn được giảm 10% giá trị của chính nó.
        assertThat(orders.get(0).getDiscountAmount()).isEqualByComparingTo("70000");
        assertThat(orders.get(1).getDiscountAmount()).isEqualByComparingTo("30000");
        assertThat(orders.get(0).getTotalAmount()).isEqualByComparingTo("630000");
        assertThat(orders.get(1).getTotalAmount()).isEqualByComparingTo("270000");
    }

    @Test
    @DisplayName("Đơn chưa đạt giá trị tối thiểu thì không dùng được mã giảm giá")
    void rejectsVoucherBelowMinimumOrderAmount() {
        when(voucherRepository.findByCodeForUpdate("NHOM14"))
                .thenReturn(Optional.of(voucher(10, "500000")));
        List<ReservedItem> items = List.of(
                new ReservedItem(1L, 10L, "Tai nghe", new BigDecimal("100000"), 1));

        assertThatThrownBy(() -> orderWriteService.createOrders(1L, request("NHOM14"), items))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("giá trị tối thiểu");
    }

    @Test
    @DisplayName("Mã giảm giá hết lượt dùng thì bị từ chối")
    void rejectsExhaustedVoucher() {
        Voucher exhausted = new Voucher("NHOM14", 10, BigDecimal.ZERO, 0,
                Instant.now().minus(1, ChronoUnit.HOURS), Instant.now().plus(1, ChronoUnit.DAYS));
        when(voucherRepository.findByCodeForUpdate("NHOM14")).thenReturn(Optional.of(exhausted));
        List<ReservedItem> items = List.of(
                new ReservedItem(1L, 10L, "Tai nghe", new BigDecimal("700000"), 1));

        assertThatThrownBy(() -> orderWriteService.createOrders(1L, request("NHOM14"), items))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("hết lượt dùng");
    }

    @Test
    @DisplayName("Mã giảm giá không tồn tại thì báo lỗi rõ ràng")
    void rejectsUnknownVoucher() {
        when(voucherRepository.findByCodeForUpdate("SAIMA")).thenReturn(Optional.empty());
        List<ReservedItem> items = List.of(
                new ReservedItem(1L, 10L, "Tai nghe", new BigDecimal("700000"), 1));

        assertThatThrownBy(() -> orderWriteService.createOrders(1L, request("SAIMA"), items))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Không tìm thấy mã giảm giá");
    }
}
