package order_service.service;

import java.util.List;
import order_service.dto.ReviewRequest;
import order_service.dto.ReviewResponse;
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

    public ReviewService(CustomerOrderRepository orderRepository, ReviewRepository reviewRepository) {
        this.orderRepository = orderRepository;
        this.reviewRepository = reviewRepository;
    }

    @Transactional
    public ReviewResponse create(Long orderId, Long buyerId, ReviewRequest request) {
        CustomerOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        if (!order.getBuyerId().equals(buyerId) || order.getStatus() != OrderStatus.DELIVERED
                || order.getItems().stream().noneMatch(item -> item.getProductId().equals(request.productId())))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Review is not allowed");
        if (reviewRepository.existsByOrderIdAndProductId(orderId, request.productId()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Product already reviewed for this order");
        return toResponse(
                reviewRepository.save(new Review(order, request.productId(), request.rating(), request.comment())));
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getByProduct(Long productId) {
        return reviewRepository.findAllByProductIdOrderByIdDesc(productId).stream().map(this::toResponse).toList();
    }

    private ReviewResponse toResponse(Review review) {
        return new ReviewResponse(review.getId(), review.getProductId(), review.getRating(), review.getComment());
    }
}