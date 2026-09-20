package order_service.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.List;
import order_service.dto.CartItemRequest;
import order_service.dto.CartItemResponse;
import order_service.service.ProductClient.ProductSnapshot;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CartServiceTest {

    private static final Long BUYER_ID = 3L;
    private static final String CART_KEY = "cart:3";

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private ProductClient productClient;

    private CartService cartService;

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        cartService = new CartService(redisTemplate, new ObjectMapper(), productClient);
    }

    /** Sản phẩm đang bán bình thường, còn 10 cái trong kho. */
    private ProductSnapshot product(Long id, Long storeId, String name, String price, int stock) {
        return new ProductSnapshot(id, storeId, name, new BigDecimal(price), 0, new BigDecimal(price), stock,
                null, "ACTIVE", false);
    }

    private void cartInRedisIsEmpty() {
        when(valueOperations.get(CART_KEY)).thenReturn(null);
    }

    @Test
    @DisplayName("Giỏ hàng chưa có gì trong Redis thì trả về danh sách rỗng")
    void emptyCartReturnsEmptyList() {
        cartInRedisIsEmpty();

        assertThat(cartService.getCart(BUYER_ID)).isEmpty();
    }

    @Test
    @DisplayName("Thêm sản phẩm thì lấy tên và giá từ product-service, không lấy từ người dùng")
    void addItemUsesPriceFromProductService() {
        cartInRedisIsEmpty();
        when(productClient.fetch(1L)).thenReturn(product(1L, 10L, "Tai nghe", "500000", 10));

        List<CartItemResponse> cart = cartService.addItem(BUYER_ID, new CartItemRequest(1L, 2));

        assertThat(cart).hasSize(1);
        assertThat(cart.get(0).productName()).isEqualTo("Tai nghe");
        assertThat(cart.get(0).unitPrice()).isEqualByComparingTo("500000");
        assertThat(cart.get(0).quantity()).isEqualTo(2);
        verify(valueOperations).set(eq(CART_KEY), anyString(), any(java.time.Duration.class));
    }

    @Test
    @DisplayName("Thêm lại sản phẩm đã có trong giỏ thì cộng dồn số lượng")
    void addingSameProductAccumulatesQuantity() {
        when(valueOperations.get(CART_KEY)).thenReturn(
                "[{\"productId\":1,\"storeId\":10,\"productName\":\"Tai nghe\",\"unitPrice\":500000,"
                        + "\"originalPrice\":500000,\"discountPercent\":0,\"quantity\":2,"
                        + "\"stockQuantity\":10,\"imageUrl\":null}]");
        when(productClient.fetch(1L)).thenReturn(product(1L, 10L, "Tai nghe", "500000", 10));

        List<CartItemResponse> cart = cartService.addItem(BUYER_ID, new CartItemRequest(1L, 3));

        assertThat(cart).hasSize(1);
        assertThat(cart.get(0).quantity()).isEqualTo(5);
    }

    @Test
    @DisplayName("Đổi số lượng không làm dòng hàng nhảy chỗ trong giỏ")
    void setQuantityKeepsItemPosition() {
        when(valueOperations.get(CART_KEY)).thenReturn(
                "[{\"productId\":1,\"storeId\":10,\"productName\":\"Tai nghe\",\"unitPrice\":500000,"
                        + "\"originalPrice\":500000,\"discountPercent\":0,\"quantity\":1,"
                        + "\"stockQuantity\":10,\"imageUrl\":null},"
                        + "{\"productId\":2,\"storeId\":10,\"productName\":\"Chuot\",\"unitPrice\":300000,"
                        + "\"originalPrice\":300000,\"discountPercent\":0,\"quantity\":1,"
                        + "\"stockQuantity\":10,\"imageUrl\":null}]");
        when(productClient.fetch(1L)).thenReturn(product(1L, 10L, "Tai nghe", "500000", 10));

        List<CartItemResponse> cart = cartService.setQuantity(BUYER_ID, 1L, 4);

        assertThat(cart).extracting(CartItemResponse::productId).containsExactly(1L, 2L);
        assertThat(cart.get(0).quantity()).isEqualTo(4);
    }

    @Test
    @DisplayName("Đặt số lượng bằng 0 thì sản phẩm bị xoá khỏi giỏ")
    void zeroQuantityRemovesItem() {
        when(valueOperations.get(CART_KEY)).thenReturn(
                "[{\"productId\":1,\"storeId\":10,\"productName\":\"Tai nghe\",\"unitPrice\":500000,"
                        + "\"originalPrice\":500000,\"discountPercent\":0,\"quantity\":1,"
                        + "\"stockQuantity\":10,\"imageUrl\":null}]");

        List<CartItemResponse> cart = cartService.setQuantity(BUYER_ID, 1L, 0);

        assertThat(cart).isEmpty();
        verify(productClient, never()).fetch(any());
    }

    @Test
    @DisplayName("Không thêm được nhiều hơn số lượng còn trong kho")
    void rejectsQuantityOverStock() {
        cartInRedisIsEmpty();
        when(productClient.fetch(1L)).thenReturn(product(1L, 10L, "Tai nghe", "500000", 3));

        assertThatThrownBy(() -> cartService.addItem(BUYER_ID, new CartItemRequest(1L, 5)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Chỉ còn 3 sản phẩm");
    }

    @Test
    @DisplayName("Sản phẩm của cửa hàng đang tạm ngưng thì không thêm vào giỏ được")
    void rejectsProductOfSuspendedStore() {
        cartInRedisIsEmpty();
        ProductSnapshot suspended = new ProductSnapshot(1L, 10L, "Tai nghe", new BigDecimal("500000"), 0,
                new BigDecimal("500000"), 10, null, "ACTIVE", true);
        when(productClient.fetch(1L)).thenReturn(suspended);

        assertThatThrownBy(() -> cartService.addItem(BUYER_ID, new CartItemRequest(1L, 1)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("tạm ngưng hoạt động");
    }

    @Test
    @DisplayName("Sản phẩm đã bị ẩn thì không thêm vào giỏ được")
    void rejectsHiddenProduct() {
        cartInRedisIsEmpty();
        ProductSnapshot hidden = new ProductSnapshot(1L, 10L, "Tai nghe", new BigDecimal("500000"), 0,
                new BigDecimal("500000"), 10, null, "HIDDEN", false);
        when(productClient.fetch(1L)).thenReturn(hidden);

        assertThatThrownBy(() -> cartService.addItem(BUYER_ID, new CartItemRequest(1L, 1)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("không bán");
    }

    @Test
    @DisplayName("Xoá toàn bộ giỏ hàng thì xoá luôn khoá trong Redis")
    void clearCartDeletesRedisKey() {
        cartService.clearCart(BUYER_ID);

        verify(redisTemplate).delete(CART_KEY);
    }
}
