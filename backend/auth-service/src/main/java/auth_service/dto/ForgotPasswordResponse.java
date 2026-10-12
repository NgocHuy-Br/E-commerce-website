package auth_service.dto;

/** resetCode chỉ có giá trị khi bật chế độ dev (chưa có dịch vụ gửi email). */
public record ForgotPasswordResponse(String message, String resetCode) {
}
