package order_service.dto;

import java.time.Instant;
import order_service.entity.Review;

/**
 * Đánh giá hiển thị công khai: không trả mã người mua và mã đơn để tránh lộ
 * thông tin.
 * Bản dành cho admin giữ nguyên nội dung và lý do kiểm duyệt.
 */
public record ReviewResponse(Long id, Long productId, int rating, String comment, Instant createdAt,
        String sellerReply, Instant sellerRepliedAt, boolean commentHidden, boolean removed,
        String moderationReason) {

    public static ReviewResponse publicView(Review review) {
        return new ReviewResponse(review.getId(), review.getProductId(), review.getRating(),
                review.isCommentHidden() ? null : review.getComment(), review.getCreatedAt(),
                review.getSellerReply(), review.getSellerRepliedAt(), review.isCommentHidden(), false, null);
    }

    public static ReviewResponse fullView(Review review) {
        return new ReviewResponse(review.getId(), review.getProductId(), review.getRating(), review.getComment(),
                review.getCreatedAt(), review.getSellerReply(), review.getSellerRepliedAt(),
                review.isCommentHidden(), review.isRemoved(), review.getModerationReason());
    }
}
