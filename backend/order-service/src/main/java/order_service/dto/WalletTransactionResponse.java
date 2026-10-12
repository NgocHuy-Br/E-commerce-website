package order_service.dto;

import java.math.BigDecimal;
import java.time.Instant;
import order_service.entity.WalletTransaction;
import order_service.entity.WalletTransactionStatus;
import order_service.entity.WalletTransactionType;

public record WalletTransactionResponse(Long id, Long userId, WalletTransactionType type, BigDecimal amount,
        WalletTransactionStatus status, String method, String note, Long orderId, Instant createdAt,
        Instant processedAt, String adminNote) {

    public static WalletTransactionResponse of(WalletTransaction tx) {
        return new WalletTransactionResponse(tx.getId(), tx.getUserId(), tx.getType(), tx.getAmount(),
                tx.getStatus(), tx.getMethod(), tx.getNote(), tx.getOrderId(), tx.getCreatedAt(),
                tx.getProcessedAt(), tx.getAdminNote());
    }
}
