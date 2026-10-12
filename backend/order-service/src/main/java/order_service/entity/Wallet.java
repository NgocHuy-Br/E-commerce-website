package order_service.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "wallets")
public class Wallet {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private Long userId;
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal balance = BigDecimal.ZERO;

    protected Wallet() {
    }

    public Wallet(Long userId) {
        this.userId = userId;
    }

    public Long getUserId() {
        return userId;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public void add(BigDecimal amount) {
        balance = balance.add(amount);
    }

    public void subtract(BigDecimal amount) {
        balance = balance.subtract(amount);
    }
}
