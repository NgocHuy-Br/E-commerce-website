package product_service.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;

@Entity
@Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long sellerId;

    @Column(nullable = false)
    private Long storeId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 4000)
    private String description;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal price;

    @Column(nullable = false)
    private int stockQuantity;

    @Column(length = 500)
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProductStatus status;

    /** Bị ẩn vì cửa hàng đang tạm ngưng hoặc bị từ chối, khác với việc người bán tự ẩn. */
    @Column(nullable = false)
    private boolean hiddenByStore;

    /** Khoá lạc quan, chặn hai giao dịch cùng sửa một sản phẩm. */
    @Version
    @Column(nullable = false)
    private long version;

    protected Product() {
    }

    public Product(Long sellerId, Long storeId, Category category, String name, String description, BigDecimal price,
            int stockQuantity, String imageUrl) {
        this.sellerId = sellerId;
        this.storeId = storeId;
        this.category = category;
        this.name = name;
        this.description = description;
        this.price = price;
        this.stockQuantity = stockQuantity;
        this.imageUrl = imageUrl;
        this.status = stockQuantity > 0 ? ProductStatus.ACTIVE : ProductStatus.OUT_OF_STOCK;
    }

    public Long getId() {
        return id;
    }

    public Long getSellerId() {
        return sellerId;
    }

    public Long getStoreId() {
        return storeId;
    }

    public Category getCategory() {
        return category;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public int getStockQuantity() {
        return stockQuantity;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public ProductStatus getStatus() {
        return status;
    }

    public boolean isHiddenByStore() {
        return hiddenByStore;
    }

    /** Sản phẩm chỉ được bán khi vừa đang mở bán vừa thuộc cửa hàng còn hoạt động. */
    public boolean isPurchasable() {
        return status == ProductStatus.ACTIVE && !hiddenByStore;
    }

    public void setHiddenByStore(boolean hiddenByStore) {
        this.hiddenByStore = hiddenByStore;
    }

    public long getVersion() {
        return version;
    }

    public void update(Category category, String name, String description, BigDecimal price, int stockQuantity,
            String imageUrl) {
        this.category = category;
        this.name = name;
        this.description = description;
        this.price = price;
        this.stockQuantity = stockQuantity;
        this.imageUrl = imageUrl;
        if (status != ProductStatus.HIDDEN)
            this.status = stockQuantity > 0 ? ProductStatus.ACTIVE : ProductStatus.OUT_OF_STOCK;
    }

    public void setStatus(ProductStatus status) {
        this.status = status;
    }

    /** Hoàn kho khi đơn hàng bị huỷ. */
    public void increaseStock(int quantity) {
        stockQuantity += quantity;
        if (status == ProductStatus.OUT_OF_STOCK && stockQuantity > 0) {
            status = ProductStatus.ACTIVE;
        }
    }

    public void decreaseStock(int quantity) {
        if (!isPurchasable()) {
            throw new IllegalStateException("NOT_ON_SALE");
        }
        if (quantity > stockQuantity) {
            throw new IllegalStateException("OUT_OF_STOCK");
        }
        stockQuantity -= quantity;
        if (stockQuantity == 0) {
            status = ProductStatus.OUT_OF_STOCK;
        }
    }
}
