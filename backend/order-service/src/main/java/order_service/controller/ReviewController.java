package order_service.controller;

import jakarta.validation.Valid;
import java.util.List;
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

    /** Điểm sao trung bình của một hoặc nhiều sản phẩm. */
    @GetMapping("/reviews/summary")
    public List<ReviewSummaryResponse> summarize(@RequestParam List<Long> productIds) {
        return reviewService.summarize(productIds);
    }
}
