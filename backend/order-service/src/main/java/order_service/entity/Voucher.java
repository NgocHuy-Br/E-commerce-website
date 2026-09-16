package order_service.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "vouchers")
public class Voucher {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 40)
    private String code;
    @Column(nullable = false)
    private int discountPercent;
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal minimumOrderAmount;
    @Column(nullable = false)
    private int remainingUses;
    @Column(nullable = false)
    private Instant startsAt;
    @Column(nullable = false)
    private Instant endsAt;

    protected Voucher() {
    }

    public Voucher(String code, int discountPercent, BigDecimal minimumOrderAmount, int remainingUses, Instant startsAt,
            Instant endsAt) {
        this.code = code;
        this.discountPercent = discountPercent;
        this.minimumOrderAmount = minimumOrderAmount;
        this.remainingUses = remainingUses;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
    }

    public String getCode() {
        return code;
    }

    public int getDiscountPercent() {
        return discountPercent;
    }

    public BigDecimal getMinimumOrderAmount() {
        return minimumOrderAmount;
    }

    public int getRemainingUses() {
        return remainingUses;
    }

    public Instant getStartsAt() {
        return startsAt;
    }

    public Instant getEndsAt() {
        return endsAt;
    }

    public void use() {
        if (remainingUses < 1)
            throw new IllegalStateException("Voucher has no remaining uses");
        remainingUses--;
    }
}