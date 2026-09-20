package order_service.dto;

import java.time.Instant;

/** Đánh giá hiển thị công khai: không trả mã người mua và mã đơn để tránh lộ thông tin. */
public record ReviewResponse(Long id, Long productId, int rating, String comment, Instant createdAt) {
}
