package order_service.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

/** Một dòng biến động số dư ví; amount âm là tiền ra, dương là tiền vào. */
@Entity
@Table(name = "wallet_transactions")
public class WalletTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long userId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private WalletTransactionType type;
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WalletTransactionStatus status;
    @Column(length = 30)
    private String method;
    @Column(length = 255)
    private String note;
    private Long orderId;
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
    private Instant processedAt;
    @Column(length = 255)
    private String adminNote;

    protected WalletTransaction() {
    }

    public WalletTransaction(Long userId, WalletTransactionType type, BigDecimal amount,
            WalletTransactionStatus status, String method, String note, Long orderId) {
        this.userId = userId;
        this.type = type;
        this.amount = amount;
        this.status = status;
        this.method = method;
        this.note = note;
        this.orderId = orderId;
        this.createdAt = Instant.now();
        if (status != WalletTransactionStatus.PENDING) {
            this.processedAt = this.createdAt;
        }
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public WalletTransactionType getType() {
        return type;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public WalletTransactionStatus getStatus() {
        return status;
    }

    public String getMethod() {
        return method;
    }

    public String getNote() {
        return note;
    }

    public Long getOrderId() {
        return orderId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getProcessedAt() {
        return processedAt;
    }

    public String getAdminNote() {
        return adminNote;
    }

    public void resolve(WalletTransactionStatus status, String adminNote) {
        this.status = status;
        this.adminNote = adminNote;
        this.processedAt = Instant.now();
    }
}
