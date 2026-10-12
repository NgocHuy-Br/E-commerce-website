package order_service.dto;

import java.time.Instant;
import order_service.entity.Review;

/**
 * Đánh giá của cửa hàng dành cho người bán: kèm tên sản phẩm, bình luận bị ẩn
 * thì không lộ nội dung.
 */
public record SellerReviewResponse(Long id, Long productId, String productName, int rating, String comment,
        Instant createdAt, String sellerReply, Instant sellerRepliedAt, boolean commentHidden) {

    public static SellerReviewResponse of(Review review) {
        String name = review.getOrder().getItems().stream()
                .filter(item -> item.getProductId().equals(review.getProductId()))
                .map(item -> item.getProductName()).findFirst().orElse("Sản phẩm #" + review.getProductId());
        return new SellerReviewResponse(review.getId(), review.getProductId(), name, review.getRating(),
                review.isCommentHidden() ? null : review.getComment(), review.getCreatedAt(),
                review.getSellerReply(), review.getSellerRepliedAt(), review.isCommentHidden());
    }
}
