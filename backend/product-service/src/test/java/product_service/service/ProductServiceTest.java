package product_service.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.web.server.ResponseStatusException;
import product_service.dto.ProductRequest;
import product_service.dto.ProductResponse;
import product_service.entity.Category;
import product_service.entity.Product;
import product_service.entity.ProductStatus;
import product_service.repository.CategoryRepository;
import product_service.repository.ProductRepository;
import product_service.repository.PromotionRepository;
import product_service.security.AuthPrincipal;

/** Kiểm tra nghiệp vụ đăng bán, ẩn/hiện và trừ kho sản phẩm. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ProductServiceTest {

    private static final AuthPrincipal SELLER = new AuthPrincipal(2L, "nguoiban@nhom14.vn",
            Set.of("BUYER", "SELLER"));
    private static final String TOKEN = "Bearer token-nguoi-ban";

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private PromotionRepository promotionRepository;

    @Mock
    private StoreVerificationClient storeVerificationClient;

    @Mock
    private PricingService pricingService;

    @InjectMocks
    private ProductService productService;

    private Category category() {
        Category category = new Category("Điện tử", null);
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        return category;
    }

    private Product product(int stock) {
        return new Product(2L, 1L, new Category("Điện tử", null), "Tai nghe", "Mô tả",
                new BigDecimal("500000"), stock, null);
    }

    private ProductRequest request() {
        return new ProductRequest(1L, 1L, "Tai nghe Bluetooth", "Mô tả", new BigDecimal("500000"), 10, null);
    }

    @Test
    @DisplayName("Đăng bán phải xác minh cửa hàng đang hoạt động trước khi lưu")
    void createVerifiesStoreBeforeSaving() {
        category();
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response = productService.create(SELLER, request(), TOKEN);

        verify(storeVerificationClient).verifyActiveOwner(1L, 2L, TOKEN);
        assertThat(response.name()).isEqualTo("Tai nghe Bluetooth");
        assertThat(response.status()).isEqualTo(ProductStatus.ACTIVE);
    }

    @Test
    @DisplayName("Người bán không sửa được sản phẩm của người khác")
    void cannotUpdateProductOfAnotherSeller() {
        when(productRepository.findByIdAndSellerId(9L, 2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productService.update(9L, 2L, request()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Không tìm thấy sản phẩm");
    }

    @Test
    @DisplayName("Sản phẩm bị ẩn thì khách không xem được trang chi tiết")
    void hiddenProductIsNotVisible() {
        Product hidden = product(5);
        hidden.setStatus(ProductStatus.HIDDEN);
        when(productRepository.findById(1L)).thenReturn(Optional.of(hidden));

        assertThatThrownBy(() -> productService.getVisible(1L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Không tìm thấy sản phẩm");
    }

    @Test
    @DisplayName("Cửa hàng đang tạm ngưng thì người bán chưa mở bán lại được sản phẩm")
    void cannotShowProductWhileStoreSuspended() {
        Product product = product(5);
        product.setHiddenByStore(true);
        when(productRepository.findByIdAndSellerId(1L, 2L)).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> productService.updateVisibility(1L, 2L, true))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("đang bị tạm ngưng");
    }

    @Test
    @DisplayName("Trừ kho phải khoá dòng sản phẩm và giảm đúng số lượng")
    void reserveStockLocksRowAndDecreasesQuantity() {
        Product product = product(10);
        when(productRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(product));

        productService.reserveStock(1L, 3);

        verify(productRepository).findByIdForUpdate(1L);
        assertThat(product.getStockQuantity()).isEqualTo(7);
    }

    @Test
    @DisplayName("Trừ kho nhiều hơn số còn lại thì báo còn bao nhiêu sản phẩm")
    void reserveStockRejectsWhenNotEnough() {
        when(productRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(product(2)));

        assertThatThrownBy(() -> productService.reserveStock(1L, 5))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("chỉ còn 2 sản phẩm");
    }

    @Test
    @DisplayName("Hoàn kho thì cộng lại số lượng đã trừ")
    void releaseStockIncreasesQuantity() {
        Product product = product(1);
        product.decreaseStock(1);
        when(productRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(product));

        productService.releaseStock(1L, 1);

        assertThat(product.getStockQuantity()).isEqualTo(1);
        assertThat(product.getStatus()).isEqualTo(ProductStatus.ACTIVE);
    }

    @Test
    @DisplayName("Tạm ngưng cửa hàng thì đánh dấu ẩn toàn bộ sản phẩm của cửa hàng")
    void setStoreVisibilityHidesAllProductsOfStore() {
        Product first = product(5);
        Product second = product(3);
        when(productRepository.findAllByStoreId(1L)).thenReturn(List.of(first, second));

        int affected = productService.setStoreVisibility(1L, false);

        assertThat(affected).isEqualTo(2);
        assertThat(first.isHiddenByStore()).isTrue();
        assertThat(second.isHiddenByStore()).isTrue();
    }

    @Test
    @DisplayName("Tìm kiếm chỉ trả về sản phẩm đang mở bán")
    void searchOnlyReturnsActiveProducts() {
        // PricingService thật trả về HashMap nên dùng HashMap cho giống
        when(pricingService.activeDiscounts(anyCollection())).thenReturn(new java.util.HashMap<>());
        when(productRepository.search(any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of(product(5)));

        List<ProductResponse> result = productService.search(null, null, null, null,
                org.springframework.data.domain.Sort.by("id"));

        assertThat(result).hasSize(1);
        verify(productRepository).search(org.mockito.ArgumentMatchers.eq(ProductStatus.ACTIVE), any(), any(),
                any(), any(), any());
    }
}
