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
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    protected CustomerOrder() {
    }

    public CustomerOrder(Long buyerId, String shippingAddress, PaymentMethod paymentMethod) {
        this.buyerId = buyerId;
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

    public void applyVoucher(Voucher voucher) {
        discountAmount = totalAmount.multiply(BigDecimal.valueOf(voucher.getDiscountPercent()))
                .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        totalAmount = totalAmount.subtract(discountAmount);
        voucherCode = voucher.getCode();
    }

    public Long getId() {
        return id;
    }

    public Long getBuyerId() {
        return buyerId;
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

    public void setStatus(OrderStatus status) {
        this.status = status;
    }

    public void setPaymentStatus(PaymentStatus paymentStatus) {
        this.paymentStatus = paymentStatus;
    }
}