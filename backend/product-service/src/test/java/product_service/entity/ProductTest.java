package product_service.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ProductTest {

    private Product newProduct(int stock) {
        return new Product(1L, 1L, new Category("Điện tử", null), "Tai nghe", "Mô tả",
                new BigDecimal("500000"), stock, null);
    }

    @Test
    @DisplayName("Sản phẩm còn hàng thì mở bán, hết hàng thì tự chuyển sang hết hàng")
    void statusFollowsStockQuantity() {
        assertThat(newProduct(5).getStatus()).isEqualTo(ProductStatus.ACTIVE);
        assertThat(newProduct(0).getStatus()).isEqualTo(ProductStatus.OUT_OF_STOCK);
    }

    @Test
    @DisplayName("Trừ kho hết thì sản phẩm chuyển sang trạng thái hết hàng")
    void decreaseStockToZeroMarksOutOfStock() {
        Product product = newProduct(2);

        product.decreaseStock(2);

        assertThat(product.getStockQuantity()).isZero();
        assertThat(product.getStatus()).isEqualTo(ProductStatus.OUT_OF_STOCK);
        assertThat(product.isPurchasable()).isFalse();
    }

    @Test
    @DisplayName("Không được trừ kho nhiều hơn số lượng còn lại")
    void decreaseStockRejectsMoreThanAvailable() {
        Product product = newProduct(1);

        assertThatThrownBy(() -> product.decreaseStock(2))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("OUT_OF_STOCK");
        assertThat(product.getStockQuantity()).isEqualTo(1);
    }

    @Test
    @DisplayName("Hoàn kho cho sản phẩm đã hết hàng thì mở bán lại")
    void increaseStockReactivatesProduct() {
        Product product = newProduct(1);
        product.decreaseStock(1);

        product.increaseStock(3);

        assertThat(product.getStockQuantity()).isEqualTo(3);
        assertThat(product.getStatus()).isEqualTo(ProductStatus.ACTIVE);
    }

    @Test
    @DisplayName("Sản phẩm của cửa hàng bị tạm ngưng thì không bán được dù còn hàng")
    void hiddenByStoreBlocksPurchase() {
        Product product = newProduct(10);
        product.setHiddenByStore(true);

        assertThat(product.isPurchasable()).isFalse();
        assertThatThrownBy(() -> product.decreaseStock(1))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("NOT_ON_SALE");
    }

    @Test
    @DisplayName("Người bán tự ẩn sản phẩm thì cũng không bán được")
    void hiddenBySellerBlocksPurchase() {
        Product product = newProduct(10);
        product.setStatus(ProductStatus.HIDDEN);

        assertThat(product.isPurchasable()).isFalse();
        assertThatThrownBy(() -> product.decreaseStock(1)).isInstanceOf(IllegalStateException.class);
    }
}
