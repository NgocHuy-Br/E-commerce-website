package order_service.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;
import order_service.dto.ReviewRequest;
import order_service.dto.ReviewResponse;
import order_service.entity.CustomerOrder;
import order_service.entity.OrderItem;
import order_service.entity.OrderStatus;
import order_service.entity.PaymentMethod;
import order_service.entity.Review;
import order_service.repository.CustomerOrderRepository;
import order_service.repository.ReviewRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.web.server.ResponseStatusException;

/** Kiểm tra quy tắc đánh sao và nhận xét sau khi mua. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ReviewServiceTest {

    private static final Long BUYER_ID = 3L;

    @Mock
    private CustomerOrderRepository orderRepository;

    @Mock
    private ReviewRepository reviewRepository;

    @InjectMocks
    private ReviewService reviewService;

    /** Một đơn hàng của người mua 3, chứa sản phẩm số 1. */
    private CustomerOrder order(OrderStatus status, Long buyerId) {
        CustomerOrder order = new CustomerOrder(buyerId, 1L, "Hà Nội", PaymentMethod.COD);
        order.addItem(new OrderItem(order, 1L, 1L, "Tai nghe", new BigDecimal("500000"), 1));
        order.setStatus(status);
        when(orderRepository.findById(10L)).thenReturn(Optional.of(order));
        return order;
    }

    private ReviewRequest review(Long productId) {
        return new ReviewRequest(productId, 5, "Sản phẩm dùng tốt");
    }

    @Test
    @DisplayName("Đơn chưa nhận hàng thì chưa được đánh giá")
    void cannotReviewBeforeDelivery() {
        order(OrderStatus.SHIPPING, BUYER_ID);

        assertThatThrownBy(() -> reviewService.create(10L, BUYER_ID, review(1L)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("sau khi nhận hàng");
    }

    @Test
    @DisplayName("Không đánh giá được đơn của người khác")
    void cannotReviewOrderOfAnotherBuyer() {
        order(OrderStatus.DELIVERED, 99L);

        assertThatThrownBy(() -> reviewService.create(10L, BUYER_ID, review(1L)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("không thuộc về bạn");
    }

    @Test
    @DisplayName("Không đánh giá được sản phẩm không có trong đơn")
    void cannotReviewProductNotInOrder() {
        order(OrderStatus.DELIVERED, BUYER_ID);

        assertThatThrownBy(() -> reviewService.create(10L, BUYER_ID, review(99L)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("không có trong đơn hàng");
    }

    @Test
    @DisplayName("Mỗi sản phẩm trong một đơn chỉ đánh giá được một lần")
    void cannotReviewSameProductTwice() {
        order(OrderStatus.DELIVERED, BUYER_ID);
        when(reviewRepository.existsByOrderIdAndProductId(10L, 1L)).thenReturn(true);

        assertThatThrownBy(() -> reviewService.create(10L, BUYER_ID, review(1L)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("đã đánh giá sản phẩm này");
    }

    @Test
    @DisplayName("Đơn đã nhận hàng và chưa đánh giá thì lưu được đánh giá")
    void reviewIsSavedForDeliveredOrder() {
        order(OrderStatus.DELIVERED, BUYER_ID);
        when(reviewRepository.existsByOrderIdAndProductId(10L, 1L)).thenReturn(false);
        when(reviewRepository.save(any(Review.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ReviewResponse response = reviewService.create(10L, BUYER_ID, review(1L));

        assertThat(response.productId()).isEqualTo(1L);
        assertThat(response.rating()).isEqualTo(5);
        assertThat(response.comment()).isEqualTo("Sản phẩm dùng tốt");
    }

    @Test
    @DisplayName("Sản phẩm chưa ai đánh giá thì điểm trung bình bằng 0")
    void summaryOfProductWithoutReview() {
        when(reviewRepository.summarizeByProductIds(any())).thenReturn(java.util.List.of());

        var summaries = reviewService.summarize(java.util.List.of(1L));

        assertThat(summaries).hasSize(1);
        assertThat(summaries.get(0).averageRating()).isZero();
        assertThat(summaries.get(0).reviewCount()).isZero();
    }
}
