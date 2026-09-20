package product_service.dto;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Kiểm tra ràng buộc của sản phẩm khi người bán đăng lên. */
class ProductRequestValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private List<String> errorsOf(ProductRequest request) {
        return validator.validate(request).stream().map(ConstraintViolation::getMessage).toList();
    }

    private ProductRequest product(String name, String price, int stock) {
        return new ProductRequest(1L, 1L, name, "Mô tả", new BigDecimal(price), stock, null);
    }

    @Test
    @DisplayName("Sản phẩm hợp lệ thì không có lỗi")
    void validProductHasNoError() {
        assertThat(errorsOf(product("Tai nghe Bluetooth Air 3", "890000", 25))).isEmpty();
    }

    @Test
    @DisplayName("Tên sản phẩm có dấu nháy hoặc hai chấm vẫn hợp lệ")
    void nameWithQuoteAndColonIsAccepted() {
        assertThat(errorsOf(product("Laptop Dell 15.6\" FHD", "15000000", 3))).isEmpty();
        assertThat(errorsOf(product("Combo: 2 sản phẩm (tặng kèm)", "150000", 10))).isEmpty();
    }

    @Test
    @DisplayName("Tên sản phẩm chứa thẻ script thì báo lỗi")
    void nameWithScriptTagIsRejected() {
        assertThat(errorsOf(product("Tai nghe <script>", "500000", 5)))
                .contains("Tên sản phẩm chứa ký tự không được phép");
    }

    @Test
    @DisplayName("Giá bằng 0 hoặc số âm thì báo lỗi")
    void nonPositivePriceIsRejected() {
        assertThat(errorsOf(product("Tai nghe", "0", 5))).contains("Giá phải là số lớn hơn 0");
        assertThat(errorsOf(product("Tai nghe", "-1000", 5))).contains("Giá phải là số lớn hơn 0");
    }

    @Test
    @DisplayName("Giá có quá 2 số thập phân thì báo lỗi")
    void priceWithThreeDecimalsIsRejected() {
        assertThat(errorsOf(product("Tai nghe", "100.555", 5)))
                .contains("Giá chỉ được có tối đa 2 số thập phân");
    }

    @Test
    @DisplayName("Tồn kho âm thì báo lỗi, tồn kho bằng 0 thì hợp lệ")
    void stockQuantityRules() {
        assertThat(errorsOf(product("Tai nghe", "500000", -1)))
                .contains("Tồn kho phải là số không âm");
        assertThat(errorsOf(product("Tai nghe", "500000", 0))).isEmpty();
    }

    @Test
    @DisplayName("Thiếu danh mục thì báo lỗi")
    void missingCategoryIsRejected() {
        ProductRequest request = new ProductRequest(1L, null, "Tai nghe", "Mô tả",
                new BigDecimal("500000"), 5, null);

        assertThat(errorsOf(request)).contains("Hãy chọn danh mục");
    }
}
