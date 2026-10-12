package order_service.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
public class CustomerOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long buyerId;

    /**
     * Mỗi đơn hàng chỉ thuộc một cửa hàng; giỏ nhiều shop được tách thành nhiều
     * đơn.
     */
    @Column(nullable = false)
    private Long storeId;
    private Long sellerId;
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount;
    @Column(nullable = false, length = 500)
    private String shippingAddress;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PaymentMethod paymentMethod;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentStatus paymentStatus;
    @Column(precision = 15, scale = 2)
    private BigDecimal discountAmount;
    @Column(length = 40)
    private String voucherCode;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status;
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
    @Column(length = 30)
    private String carrier;
    @Column(length = 40)
    private String trackingCode;
    private Instant shippedAt;
    private Instant estimatedDeliveryAt;
    private Instant deliveredAt;
    @Column(precision = 5, scale = 2)
    private BigDecimal commissionPercent;
    @Column(precision = 15, scale = 2)
    private BigDecimal commissionAmount;
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    protected CustomerOrder() {
    }

    public CustomerOrder(Long buyerId, Long storeId, String shippingAddress, PaymentMethod paymentMethod) {
        this.buyerId = buyerId;
        this.storeId = storeId;
        this.shippingAddress = shippingAddress;
        this.paymentMethod = paymentMethod;
        // Trả trước thì ghi nhận đã thanh toán ngay, COD thì chờ người mua trả tiền.
        this.paymentStatus = paymentMethod.isPayOnDelivery() ? PaymentStatus.PENDING : PaymentStatus.PAID;
        this.status = OrderStatus.PENDING;
        this.createdAt = Instant.now();
        this.totalAmount = BigDecimal.ZERO;
    }

    public void addItem(OrderItem item) {
        items.add(item);
        totalAmount = totalAmount.add(item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
    }

    /** Áp mã giảm giá theo phần trăm lên tổng tiền của đơn này. */
    public void applyVoucher(Voucher voucher) {
        discountAmount = totalAmount.multiply(BigDecimal.valueOf(voucher.getDiscountPercent()))
                .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        totalAmount = totalAmount.subtract(discountAmount);
        voucherCode = voucher.getCode();
    }

    /** Chốt phí nền tảng trên tổng tiền người mua phải trả (sau giảm giá). */
    public void applyCommission(BigDecimal percent) {
        this.commissionPercent = percent;
        this.commissionAmount = totalAmount.multiply(percent)
                .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
    }

    public BigDecimal getCommissionPercent() {
        return commissionPercent == null ? BigDecimal.ZERO : commissionPercent;
    }

    public BigDecimal getCommissionAmount() {
        return commissionAmount == null ? BigDecimal.ZERO : commissionAmount;
    }

    public Long getId() {
        return id;
    }

    public Long getBuyerId() {
        return buyerId;
    }

    public Long getStoreId() {
        return storeId;
    }

    public Long getSellerId() {
        return sellerId;
    }

    public void setSellerId(Long sellerId) {
        this.sellerId = sellerId;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public String getShippingAddress() {
        return shippingAddress;
    }

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    /** Người mua có thể đổi phương thức khi bấm thanh toán đơn COD. */
    public void setPaymentMethod(PaymentMethod paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public PaymentStatus getPaymentStatus() {
        return paymentStatus;
    }

    public BigDecimal getDiscountAmount() {
        return discountAmount == null ? BigDecimal.ZERO : discountAmount;
    }

    public String getVoucherCode() {
        return voucherCode;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public List<OrderItem> getItems() {
        return items;
    }

    public String getCarrier() {
        return carrier;
    }

    public String getTrackingCode() {
        return trackingCode;
    }

    public Instant getShippedAt() {
        return shippedAt;
    }

    public Instant getEstimatedDeliveryAt() {
        return estimatedDeliveryAt;
    }

    public Instant getDeliveredAt() {
        return deliveredAt;
    }

    public void ship(String carrier, String trackingCode, Instant estimatedDeliveryAt) {
        this.carrier = carrier;
        this.trackingCode = trackingCode;
        this.shippedAt = Instant.now();
        this.estimatedDeliveryAt = estimatedDeliveryAt;
    }

    public void markDelivered() {
        this.deliveredAt = Instant.now();
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
    }

    public void setPaymentStatus(PaymentStatus paymentStatus) {
        this.paymentStatus = paymentStatus;
    }
}