package order_service.controller;

import jakarta.validation.Valid;
import java.util.List;
import order_service.dto.ReviewModerationRequest;
import order_service.dto.ReviewReplyRequest;
import order_service.dto.ReviewRequest;
import order_service.dto.ReviewResponse;
import order_service.dto.ReviewSummaryResponse;
import order_service.security.AuthPrincipal;
import order_service.service.ReviewService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
public class ReviewController {
    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping("/{orderId}/reviews")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('BUYER')")
    public ReviewResponse create(@PathVariable Long orderId, @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody ReviewRequest request) {
        return reviewService.create(orderId, principal.userId(), request);
    }

    @GetMapping("/reviews")
    public List<ReviewResponse> getByProduct(@RequestParam Long productId) {
        return reviewService.getByProduct(productId);
    }

    /** Người bán phản hồi đánh giá thuộc cửa hàng của mình. */
    @PutMapping("/reviews/{reviewId}/reply")
    @PreAuthorize("hasRole('SELLER')")
    public ReviewResponse reply(@PathVariable Long reviewId, @Valid @RequestBody ReviewReplyRequest request,
            @RequestHeader("Authorization") String authorization) {
        return reviewService.reply(reviewId, request.reply(), authorization);
    }

    @GetMapping("/seller/reviews")
    @PreAuthorize("hasRole('SELLER')")
    public List<order_service.dto.SellerReviewResponse> forSeller(
            @RequestHeader("Authorization") String authorization) {
        return reviewService.getForSeller(authorization);
    }

    @GetMapping("/admin/reviews")
    @PreAuthorize("hasRole('ADMIN')")
    public List<ReviewResponse> forAdmin() {
        return reviewService.getForAdmin();
    }

    @PutMapping("/reviews/{reviewId}/moderation")
    @PreAuthorize("hasRole('ADMIN')")
    public ReviewResponse moderate(@PathVariable Long reviewId, @Valid @RequestBody ReviewModerationRequest request) {
        return reviewService.moderate(reviewId, request.commentHidden(), request.removed(), request.reason());
    }

    /** Điểm sao trung bình của một hoặc nhiều sản phẩm. */
    @GetMapping("/reviews/summary")
    public List<ReviewSummaryResponse> summarize(@RequestParam List<Long> productIds) {
        return reviewService.summarize(productIds);
    }
}
