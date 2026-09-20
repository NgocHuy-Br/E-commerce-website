package order_service.dto;

import java.math.BigDecimal;

/** Thay đổi của một dòng trong giỏ so với lúc người mua thêm vào. */
public record CartChange(
        Long productId,
        String productName,
        String type,
        BigDecimal oldUnitPrice,
        BigDecimal newUnitPrice,
        int oldQuantity,
        int newQuantity,
        String message) {
}
