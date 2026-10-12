package order_service.service;

import java.math.BigDecimal;
import java.util.List;
import order_service.dto.WalletResponse;
import order_service.dto.WalletTransactionResponse;
import order_service.entity.Wallet;
import order_service.entity.WalletTransaction;
import order_service.entity.WalletTransactionStatus;
import order_service.entity.WalletTransactionType;
import order_service.repository.WalletRepository;
import order_service.repository.WalletTransactionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Ví nội bộ của từng tài khoản: nạp, rút, thanh toán đơn, hoàn tiền và nhận
 * doanh thu bán hàng.
 */
@Service
public class WalletService {

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository transactionRepository;

    public WalletService(WalletRepository walletRepository, WalletTransactionRepository transactionRepository) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional(readOnly = true)
    public WalletResponse get(Long userId) {
        BigDecimal balance = walletRepository.findByUserId(userId).map(Wallet::getBalance).orElse(BigDecimal.ZERO);
        // Tiền rút đang chờ duyệt được lưu âm nên đổi dấu để hiển thị.
        BigDecimal pending = transactionRepository
                .sumAmount(userId, WalletTransactionType.WITHDRAW, WalletTransactionStatus.PENDING).negate();
        List<WalletTransactionResponse> transactions = transactionRepository.findTop100ByUserIdOrderByIdDesc(userId)
                .stream().map(WalletTransactionResponse::of).toList();
        return new WalletResponse(balance, pending, transactions);
    }

    @Transactional
    public WalletResponse topup(Long userId, BigDecimal amount, String method) {
        Wallet wallet = lockedWallet(userId);
        wallet.add(amount);
        transactionRepository.save(new WalletTransaction(userId, WalletTransactionType.TOPUP, amount,
                WalletTransactionStatus.COMPLETED, method, "Nạp tiền vào ví", null));
        return get(userId);
    }

    /**
     * Trừ tiền ngay khi tạo yêu cầu rút; nếu admin từ chối thì tiền được trả lại.
     */
    @Transactional
    public WalletResponse requestWithdraw(Long userId, BigDecimal amount, String method) {
        Wallet wallet = lockedWallet(userId);
        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số dư ví không đủ để rút");
        }
        wallet.subtract(amount);
        transactionRepository.save(new WalletTransaction(userId, WalletTransactionType.WITHDRAW, amount.negate(),
                WalletTransactionStatus.PENDING, method, "Yêu cầu rút tiền", null));
        return get(userId);
    }

    /**
     * Thanh toán đơn bằng ví; thiếu tiền thì từ chối và giao dịch của đơn bị huỷ
     * theo.
     */
    @Transactional
    public void payOrder(Long userId, BigDecimal amount, Long orderId) {
        Wallet wallet = lockedWallet(userId);
        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số dư ví không đủ để thanh toán đơn hàng");
        }
        wallet.subtract(amount);
        transactionRepository.save(new WalletTransaction(userId, WalletTransactionType.ORDER_PAYMENT,
                amount.negate(), WalletTransactionStatus.COMPLETED, "WALLET", "Thanh toán đơn hàng #" + orderId,
                orderId));
    }

    @Transactional
    public void refundOrder(Long userId, BigDecimal amount, Long orderId) {
        credit(userId, amount, WalletTransactionType.REFUND, "Hoàn tiền đơn hàng #" + orderId, orderId);
    }

    /**
     * Doanh thu của người bán sau khi trừ phí nền tảng, ghi nhận khi đơn đã giao.
     */
    @Transactional
    public void settleSeller(Long sellerId, BigDecimal amount, Long orderId) {
        if (amount.signum() <= 0) {
            return;
        }
        credit(sellerId, amount, WalletTransactionType.SELLER_SETTLEMENT,
                "Doanh thu đơn hàng #" + orderId + " (đã trừ phí nền tảng)", orderId);
    }

    @Transactional(readOnly = true)
    public List<WalletTransactionResponse> withdrawals(WalletTransactionStatus status) {
        List<WalletTransaction> rows = status == null
                ? transactionRepository.findAllByTypeOrderByIdDesc(WalletTransactionType.WITHDRAW)
                : transactionRepository.findAllByTypeAndStatusOrderByIdDesc(WalletTransactionType.WITHDRAW, status);
        return rows.stream().map(WalletTransactionResponse::of).toList();
    }

    @Transactional
    public WalletTransactionResponse resolveWithdrawal(Long transactionId, boolean approve, String note) {
        WalletTransaction tx = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu rút"));
        if (tx.getType() != WalletTransactionType.WITHDRAW || tx.getStatus() != WalletTransactionStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Yêu cầu này đã được xử lý");
        }
        String adminNote = note == null || note.isBlank() ? null : note.trim();
        if (approve) {
            tx.resolve(WalletTransactionStatus.COMPLETED, adminNote);
        } else {
            tx.resolve(WalletTransactionStatus.CANCELLED, adminNote);
            lockedWallet(tx.getUserId()).add(tx.getAmount().negate());
            transactionRepository.save(new WalletTransaction(tx.getUserId(), WalletTransactionType.REFUND,
                    tx.getAmount().negate(), WalletTransactionStatus.COMPLETED, null,
                    "Hoàn tiền do yêu cầu rút #" + tx.getId() + " bị từ chối", null));
        }
        return WalletTransactionResponse.of(tx);
    }

    private void credit(Long userId, BigDecimal amount, WalletTransactionType type, String note, Long orderId) {
        lockedWallet(userId).add(amount);
        transactionRepository.save(new WalletTransaction(userId, type, amount, WalletTransactionStatus.COMPLETED,
                "WALLET", note, orderId));
    }

    private Wallet lockedWallet(Long userId) {
        return walletRepository.findByUserIdForUpdate(userId)
                .orElseGet(() -> walletRepository.saveAndFlush(new Wallet(userId)));
    }
}
