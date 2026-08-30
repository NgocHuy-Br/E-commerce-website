package order_service.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "reviews", uniqueConstraints = @UniqueConstraint(columnNames = { "order_id", "product_id" }))
public class Review {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id")
    private CustomerOrder order;
    @Column(name = "product_id", nullable = false)
    private Long productId;
    @Column(nullable = false)
    private int rating;
    @Column(length = 2000)
    private String comment;
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected Review() {
    }

    public Review(CustomerOrder order, Long productId, int rating, String comment) {
        this.order = order;
        this.productId = productId;
        this.rating = rating;
        this.comment = comment;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getProductId() {
        return productId;
    }

    public int getRating() {
        return rating;
    }

    public String getComment() {
        return comment;
    }
}