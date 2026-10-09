package product_service.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "promotions")
public class Promotion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(length = 36)
    private String campaignId;

    @Column(length = 200)
    private String campaignName;

    private Boolean cancelled = false;

    @Column(nullable = false)
    private int discountPercent;

    @Column(nullable = false)
    private Instant startsAt;

    @Column(nullable = false)
    private Instant endsAt;

    protected Promotion() {
    }

    public Promotion(Product product, int discountPercent, Instant startsAt, Instant endsAt) {
        this(product, UUID.randomUUID().toString(), product.getName(), discountPercent, startsAt, endsAt);
    }

    public Promotion(Product product, String campaignId, String campaignName, int discountPercent,
            Instant startsAt, Instant endsAt) {
        this.product = product;
        this.campaignId = campaignId;
        this.campaignName = campaignName;
        this.discountPercent = discountPercent;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
    }

    public Long getId() {
        return id;
    }

    public Product getProduct() {
        return product;
    }

    public String getCampaignId() {
        return campaignId;
    }

    public String getCampaignName() {
        return campaignName;
    }

    public boolean isCancelled() {
        return Boolean.TRUE.equals(cancelled);
    }

    public int getDiscountPercent() {
        return discountPercent;
    }

    public Instant getStartsAt() {
        return startsAt;
    }

    public Instant getEndsAt() {
        return endsAt;
    }

    public void cancel() {
        cancelled = true;
    }
}
