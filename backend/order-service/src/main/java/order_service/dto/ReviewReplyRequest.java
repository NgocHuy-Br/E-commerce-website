package order_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReviewReplyRequest(
        @NotBlank(message = "Nội dung phản hồi không được để trống") @Size(max = 1000, message = "Phản hồi tối đa 1000 ký tự") String reply) {
}
