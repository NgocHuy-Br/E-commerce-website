package order_service.controller;

import jakarta.validation.Valid;
import java.util.List;
import order_service.dto.WalletAmountRequest;
import order_service.dto.WalletResponse;
import order_service.dto.WalletTransactionResponse;
import order_service.dto.WithdrawalDecisionRequest;
import order_service.entity.WalletTransactionStatus;
import order_service.security.AuthPrincipal;
import order_service.service.WalletService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
public class WalletController {
    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    @GetMapping("/wallet")
    @PreAuthorize("hasAnyRole('BUYER','SELLER')")
    public WalletResponse get(@AuthenticationPrincipal AuthPrincipal principal) {
        return walletService.get(principal.userId());
    }

    @PostMapping("/wallet/topup")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('BUYER','SELLER')")
    public WalletResponse topup(@AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody WalletAmountRequest request) {
        return walletService.topup(principal.userId(), request.amount(), request.method());
    }

    @PostMapping("/wallet/withdraw")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('BUYER','SELLER')")
    public WalletResponse withdraw(@AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody WalletAmountRequest request) {
        return walletService.requestWithdraw(principal.userId(), request.amount(), request.method());
    }

    @GetMapping("/admin/withdrawals")
    @PreAuthorize("hasRole('ADMIN')")
    public List<WalletTransactionResponse> withdrawals(@RequestParam(required = false) WalletTransactionStatus status) {
        return walletService.withdrawals(status);
    }

    @PutMapping("/admin/withdrawals/{transactionId}")
    @PreAuthorize("hasRole('ADMIN')")
    public WalletTransactionResponse resolve(@PathVariable Long transactionId,
            @Valid @RequestBody WithdrawalDecisionRequest request) {
        return walletService.resolveWithdrawal(transactionId, request.approve(), request.note());
    }
}
