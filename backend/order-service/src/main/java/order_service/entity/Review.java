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
    @Column(length = 1000)
    private String sellerReply;
    private Instant sellerRepliedAt;
    @Column(nullable = false)
    private boolean commentHidden;
    @Column(nullable = false)
    private boolean removed;
    @Column(length = 500)
    private String moderationReason;

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

    public CustomerOrder getOrder() {
        return order;
    }

    public Instant getCreatedAt() {
        return createdAt;
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

    public String getSellerReply() {
        return sellerReply;
    }

    public Instant getSellerRepliedAt() {
        return sellerRepliedAt;
    }

    public boolean isCommentHidden() {
        return commentHidden;
    }

    public boolean isRemoved() {
        return removed;
    }

    public String getModerationReason() {
        return moderationReason;
    }

    public void reply(String reply) {
        this.sellerReply = reply;
        this.sellerRepliedAt = Instant.now();
    }

    public void moderate(boolean commentHidden, boolean removed, String reason) {
        this.commentHidden = commentHidden;
        this.removed = removed;
        this.moderationReason = commentHidden || removed ? reason : null;
    }
}