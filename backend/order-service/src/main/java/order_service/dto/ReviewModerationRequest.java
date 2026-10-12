package order_service.dto;

import jakarta.validation.constraints.Size;

/**
 * Admin ẩn bình luận hoặc gỡ đánh giá vi phạm; cả hai đều false nghĩa là khôi
 * phục.
 */
public record ReviewModerationRequest(boolean commentHidden, boolean removed,
        @Size(max = 500, message = "Lý do tối đa 500 ký tự") String reason) {
}
