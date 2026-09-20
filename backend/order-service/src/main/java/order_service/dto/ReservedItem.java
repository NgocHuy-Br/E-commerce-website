package order_service.dto;

import java.math.BigDecimal;

/** Một dòng hàng đã được product-service trừ kho và chốt giá, chờ ghi vào đơn. */
public record ReservedItem(Long productId, Long storeId, String productName, BigDecimal unitPrice, int quantity) {

    /** Tiền của dòng hàng này = giá một sản phẩm nhân số lượng. */
    public BigDecimal lineTotal() {
        return unitPrice.multiply(BigDecimal.valueOf(quantity));
    }
}
