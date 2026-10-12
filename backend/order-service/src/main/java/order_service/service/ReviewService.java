package order_service.service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import order_service.dto.ReviewRequest;
import order_service.dto.ReviewResponse;
import order_service.dto.ReviewSummaryResponse;
import order_service.entity.CustomerOrder;
import order_service.entity.OrderStatus;
import order_service.entity.Review;
import order_service.repository.CustomerOrderRepository;
import order_service.repository.ReviewRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ReviewService {
    private final CustomerOrderRepository orderRepository;
    private final ReviewRepository reviewRepository;
    private final StoreClient storeClient;

    public ReviewService(CustomerOrderRepository orderRepository, ReviewRepository reviewRepository,
            StoreClient storeClient) {
        this.orderRepository = orderRepository;
        this.reviewRepository = reviewRepository;
        this.storeClient = storeClient;
    }

    /**
     * Chỉ cho đánh giá sản phẩm đã mua và đã nhận hàng, mỗi đơn một lần cho mỗi sản
     * phẩm.
     */
    @Transactional
    public ReviewResponse create(Long orderId, Long buyerId, ReviewRequest request) {
        CustomerOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng"));
        if (!order.getBuyerId().equals(buyerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Đơn hàng không thuộc về bạn");
        }
        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ đánh giá được sau khi nhận hàng");
        }
        if (order.getItems().stream().noneMatch(item -> item.getProductId().equals(request.productId()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sản phẩm không có trong đơn hàng này");
        }
        if (reviewRepository.existsByOrderIdAndProductId(orderId, request.productId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bạn đã đánh giá sản phẩm này trong đơn hàng");
        }
        return ReviewResponse.publicView(
                reviewRepository.save(new Review(order, request.productId(), request.rating(), request.comment())));
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getByProduct(Long productId) {
        return reviewRepository.findAllByProductIdAndRemovedFalseOrderByIdDesc(productId).stream()
                .map(ReviewResponse::publicView).toList();
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getForAdmin() {
        return reviewRepository.findAllByOrderByIdDesc().stream().map(ReviewResponse::fullView).toList();
    }

    /** Người bán chỉ phản hồi đánh giá thuộc đơn hàng của cửa hàng mình. */
    @Transactional(readOnly = true)
    public List<order_service.dto.SellerReviewResponse> getForSeller(String authorization) {
        Long storeId = storeClient.myStore(authorization).id();
        return reviewRepository.findForStore(storeId).stream()
                .map(order_service.dto.SellerReviewResponse::of).toList();
    }

    @Transactional
    public ReviewResponse reply(Long reviewId, String reply, String authorization) {
        Review review = findReview(reviewId);
        Long storeId = storeClient.myStore(authorization).id();
        if (!storeId.equals(review.getOrder().getStoreId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Đánh giá này không thuộc cửa hàng của bạn");
        }
        if (review.isRemoved()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đánh giá này đã bị gỡ");
        }
        review.reply(reply.trim());
        return ReviewResponse.publicView(review);
    }

    /**
     * Admin ẩn bình luận (vẫn tính sao) hoặc gỡ hẳn đánh giá (không hiển thị, không
     * tính sao).
     */
    @Transactional
    public ReviewResponse moderate(Long reviewId, boolean commentHidden, boolean removed, String reason) {
        Review review = findReview(reviewId);
        review.moderate(commentHidden, removed, reason == null ? null : reason.trim());
        return ReviewResponse.fullView(review);
    }

    private Review findReview(Long reviewId) {
        return reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đánh giá"));
    }

    /**
     * Điểm trung bình và số lượt đánh giá, dùng để hiển thị sao trên danh sách sản
     * phẩm.
     */
    @Transactional(readOnly = true)
    public List<ReviewSummaryResponse> summarize(List<Long> productIds) {
        if (productIds.isEmpty()) {
            return List.of();
        }
        Map<Long, ReviewRepository.RatingSummary> summaries = reviewRepository.summarizeByProductIds(productIds)
                .stream().collect(Collectors.toMap(ReviewRepository.RatingSummary::getProductId, Function.identity()));
        return productIds.stream().distinct().map(productId -> {
            ReviewRepository.RatingSummary summary = summaries.get(productId);
            return summary == null ? new ReviewSummaryResponse(productId, 0, 0)
                    : new ReviewSummaryResponse(productId, round(summary.getAverageRating()),
                            summary.getReviewCount());
        }).toList();
    }

    private double round(Double value) {
        return value == null ? 0 : Math.round(value * 10) / 10.0;
    }
}
