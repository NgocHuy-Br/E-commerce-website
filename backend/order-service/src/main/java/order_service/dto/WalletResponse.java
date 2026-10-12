package order_service.dto;

import java.math.BigDecimal;
import java.util.List;

public record WalletResponse(BigDecimal balance, BigDecimal pendingWithdraw,
        List<WalletTransactionResponse> transactions) {
}
