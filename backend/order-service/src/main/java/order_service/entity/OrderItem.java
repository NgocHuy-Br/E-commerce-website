package order_service.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
public class OrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id")
    private CustomerOrder order;
    @Column(nullable = false)
    private Long productId;
    @Column(nullable = false)
    private Long storeId;
    @Column(nullable = false, length = 200)
    private String productName;
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice;
    @Column(nullable = false)
    private int quantity;

    protected OrderItem() {
    }

    public OrderItem(CustomerOrder order, Long productId, Long storeId, String productName, BigDecimal unitPrice,
            int quantity) {
        this.order = order;
        this.productId = productId;
        this.storeId = storeId;
        this.productName = productName;
        this.unitPrice = unitPrice;
        this.quantity = quantity;
    }

    public Long getProductId() {
        return productId;
    }

    public Long getStoreId() {
        return storeId;
    }

    public String getProductName() {
        return productName;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public int getQuantity() {
        return quantity;
    }
}