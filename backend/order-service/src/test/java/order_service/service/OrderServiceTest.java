package order_service.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import order_service.dto.CartItemResponse;
import order_service.dto.CheckoutRequest;
import order_service.entity.CustomerOrder;
import order_service.entity.OrderItem;
import order_service.entity.OrderStatus;
import order_service.entity.PaymentMethod;
import order_service.entity.PaymentStatus;
import order_service.entity.Voucher;
import order_service.repository.CustomerOrderRepository;
import order_service.repository.ReviewRepository;
import order_service.repository.VoucherRepository;
import order_service.security.AuthPrincipal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.web.server.ResponseStatusException;

/** Kiểm tra nghiệp vụ đặt hàng, thanh toán và huỷ đơn. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OrderServiceTest {

    private static final Long BUYER_ID = 3L;
    private static final String TOKEN = "Bearer token-nguoi-ban";

    @Mock
    private CartService cartService;

    @Mock
    private CustomerOrderRepository orderRepository;

    @Mock
    private ProductClient productClient;

    @Mock
    private StoreClient storeClient;

    @Mock
    private VoucherRepository voucherRepository;

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private OrderWriteService orderWriteService;

    @InjectMocks
    private OrderService orderService;

    private CheckoutRequest checkoutRequest() {
        return new CheckoutRequest("Số 5 Nguyễn Trãi, Hà Nội", PaymentMethod.COD, null);
    }

    private CartItemResponse cartItem(Long productId) {
        return new CartItemResponse(productId, 1L, "Tai nghe", new BigDecimal("500000"),
                new BigDecimal("500000"), 0, 1, 10, null);
    }

    private ProductClient.ProductSnapshot snapshot(Long productId) {
        return new ProductClient.ProductSnapshot(productId, 1L, "Tai nghe", new BigDecimal("500000"), 0,
                new BigDecimal("500000"), 10, null, "ACTIVE", false);
    }

    private CustomerOrder order(OrderStatus status, PaymentStatus paymentStatus) {
        CustomerOrder order = new CustomerOrder(BUYER_ID, 1L, "Hà Nội", PaymentMethod.COD);
        order.addItem(new OrderItem(order, 1L, 1L, "Tai nghe", new BigDecimal("500000"), 1));
        order.setStatus(status);
        order.setPaymentStatus(paymentStatus);
        when(orderRepository.findById(10L)).thenReturn(Optional.of(order));
        return order;
    }

    @Test
    @DisplayName("Giỏ hàng trống thì không đặt hàng được")
    void cannotCheckoutEmptyCart() {
        when(cartService.getCart(BUYER_ID)).thenReturn(List.of());

        assertThatThrownBy(() -> orderService.checkout(BUYER_ID, checkoutRequest()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Giỏ hàng đang trống");
        verify(productClient, never()).reserve(any(), org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    @DisplayName("Đặt hàng thành công thì trừ kho, lưu đơn rồi mới xoá giỏ hàng")
    void checkoutReservesStockThenClearsCart() {
        when(cartService.getCart(BUYER_ID)).thenReturn(List.of(cartItem(1L)));
        when(productClient.reserve(1L, 1)).thenReturn(snapshot(1L));
        CustomerOrder saved = new CustomerOrder(BUYER_ID, 1L, "Hà Nội", PaymentMethod.COD);
        when(orderWriteService.createOrders(org.mockito.ArgumentMatchers.eq(BUYER_ID), any(), anyList()))
                .thenReturn(List.of(saved));

        orderService.checkout(BUYER_ID, checkoutRequest());

        verify(productClient).reserve(1L, 1);
        verify(cartService).clearCart(BUYER_ID);
    }

    @Test
    @DisplayName("Ghi đơn thất bại thì phần kho đã trừ được hoàn lại và giỏ hàng không bị xoá")
    void checkoutReturnsStockWhenSavingFails() {
        when(cartService.getCart(BUYER_ID)).thenReturn(List.of(cartItem(1L), cartItem(2L)));
        when(productClient.reserve(1L, 1)).thenReturn(snapshot(1L));
        when(productClient.reserve(2L, 1)).thenReturn(snapshot(2L));
        when(orderWriteService.createOrders(org.mockito.ArgumentMatchers.eq(BUYER_ID), any(), anyList()))
                .thenThrow(new IllegalStateException("lỗi khi ghi đơn"));

        assertThatThrownBy(() -> orderService.checkout(BUYER_ID, checkoutRequest()))
                .isInstanceOf(IllegalStateException.class);

        verify(productClient).release(1L, 1);
        verify(productClient).release(2L, 1);
        verify(cartService, never()).clearCart(BUYER_ID);
    }

    @Test
    @DisplayName("Thanh toán hai lần thì lần sau bị từ chối")
    void cannotPayTwice() {
        order(OrderStatus.PENDING, PaymentStatus.PAID);

        assertThatThrownBy(() -> orderService.pay(10L, BUYER_ID, PaymentMethod.MOMO))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("đã được thanh toán");
    }

    @Test
    @DisplayName("Thanh toán đơn của người khác thì bị từ chối")
    void cannotPayOrderOfAnotherBuyer() {
        CustomerOrder other = new CustomerOrder(99L, 1L, "Hà Nội", PaymentMethod.COD);
        when(orderRepository.findById(10L)).thenReturn(Optional.of(other));

        assertThatThrownBy(() -> orderService.pay(10L, BUYER_ID, PaymentMethod.MOMO))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("không thuộc về bạn");
    }

    @Test
    @DisplayName("Huỷ đơn thì hoàn kho, hoàn lượt mã giảm giá và chuyển sang đã hoàn tiền")
    void cancelReturnsStockAndVoucherUse() {
        CustomerOrder paidOrder = order(OrderStatus.PENDING, PaymentStatus.PAID);
        paidOrder.applyVoucher(new Voucher("NHOM14", 10, BigDecimal.ZERO, 5,
                java.time.Instant.now().minusSeconds(3600), java.time.Instant.now().plusSeconds(3600)));
        Voucher voucher = new Voucher("NHOM14", 10, BigDecimal.ZERO, 4,
                java.time.Instant.now().minusSeconds(3600), java.time.Instant.now().plusSeconds(3600));
        when(voucherRepository.findByCodeForUpdate("NHOM14")).thenReturn(Optional.of(voucher));

        orderService.cancel(10L, BUYER_ID);

        assertThat(paidOrder.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(paidOrder.getPaymentStatus()).isEqualTo(PaymentStatus.REFUNDED);
        assertThat(voucher.getRemainingUses()).isEqualTo(5);
        verify(productClient).release(1L, 1);
    }

    @Test
    @DisplayName("Đơn đang giao thì không huỷ được")
    void cannotCancelShippingOrder() {
        order(OrderStatus.SHIPPING, PaymentStatus.PAID);

        assertThatThrownBy(() -> orderService.cancel(10L, BUYER_ID))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("đang trên đường giao");
        verify(productClient, never()).release(any(), org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    @DisplayName("Đơn đã giao thì không huỷ được")
    void cannotCancelDeliveredOrder() {
        order(OrderStatus.DELIVERED, PaymentStatus.PAID);

        assertThatThrownBy(() -> orderService.cancel(10L, BUYER_ID))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("đã được giao");
    }

    @Test
    @DisplayName("Không được nhảy bậc trạng thái đơn hàng")
    void cannotSkipOrderStatus() {
        order(OrderStatus.PENDING, PaymentStatus.PENDING);
        AuthPrincipal admin = new AuthPrincipal(1L, "quantri@nhom14.vn", Set.of("ADMIN"));

        assertThatThrownBy(() -> orderService.updateStatus(10L, OrderStatus.DELIVERED, admin, TOKEN))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Không thể chuyển đơn hàng");
    }

    @Test
    @DisplayName("Người bán không xử lý được đơn của cửa hàng khác")
    void sellerCannotTouchOrderOfAnotherStore() {
        order(OrderStatus.PENDING, PaymentStatus.PENDING);
        AuthPrincipal seller = new AuthPrincipal(2L, "nguoiban@nhom14.vn", Set.of("SELLER", "BUYER"));
        when(storeClient.myStore(TOKEN))
                .thenReturn(new StoreClient.StoreSnapshot(99L, 2L, "Shop khác", "ACTIVE"));

        assertThatThrownBy(() -> orderService.updateStatus(10L, OrderStatus.CONFIRMED, seller, TOKEN))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("không thuộc cửa hàng của bạn");
    }
}
