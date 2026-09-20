package order_service.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import order_service.dto.CartItemRequest;
import order_service.dto.CartItemResponse;
import order_service.service.ProductClient.ProductSnapshot;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Giỏ hàng được lưu trong Redis dưới dạng một chuỗi JSON, mỗi người mua một khoá riêng.
 * Mọi thao tác đều theo ba bước: đọc giỏ từ Redis, sửa danh sách, ghi lại giỏ vào Redis.
 * Tên và giá sản phẩm luôn lấy từ product-service, không nhận từ phía người dùng.
 */
@Service
public class CartService {

    /** Kiểu dữ liệu để Jackson đọc chuỗi JSON thành danh sách dòng hàng. */
    private static final TypeReference<List<CartItemResponse>> CART_TYPE = new TypeReference<>() {
    };

    /** Giỏ hàng không dùng tới thì tự hết hạn, tránh giữ dữ liệu rác trong Redis. */
    private static final Duration CART_TTL = Duration.ofDays(30);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final ProductClient productClient;

    public CartService(StringRedisTemplate redisTemplate, ObjectMapper objectMapper, ProductClient productClient) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.productClient = productClient;
    }

    /** Lấy giỏ hàng; người mua chưa có giỏ thì trả về danh sách rỗng. */
    public List<CartItemResponse> getCart(Long userId) {
        String json = redisTemplate.opsForValue().get(cartKey(userId));
        if (json == null) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, CART_TYPE);
        } catch (Exception exception) {
            throw new IllegalStateException("Không đọc được giỏ hàng", exception);
        }
    }

    /** Thêm sản phẩm vào giỏ. Sản phẩm đã có trong giỏ thì cộng dồn số lượng. */
    public List<CartItemResponse> addItem(Long userId, CartItemRequest request) {
        List<CartItemResponse> cart = getCart(userId);
        int newQuantity = quantityInCart(cart, request.productId()) + request.quantity();
        return putItem(userId, cart, request.productId(), newQuantity);
    }

    /** Đặt lại số lượng của một sản phẩm trong giỏ. Số lượng bằng 0 nghĩa là xoá khỏi giỏ. */
    public List<CartItemResponse> setQuantity(Long userId, Long productId, int quantity) {
        if (quantity < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số lượng không hợp lệ");
        }
        if (quantity == 0) {
            return removeItem(userId, productId);
        }
        return putItem(userId, getCart(userId), productId, quantity);
    }

    public List<CartItemResponse> removeItem(Long userId, Long productId) {
        List<CartItemResponse> cart = new ArrayList<>(getCart(userId));
        cart.removeIf(item -> item.productId().equals(productId));
        saveCart(userId, cart);
        return cart;
    }

    public void clearCart(Long userId) {
        redisTemplate.delete(cartKey(userId));
    }

    /**
     * Ghi một sản phẩm vào giỏ với số lượng cho trước.
     * Thông tin sản phẩm được lấy mới từ product-service rồi mới kiểm tra và lưu.
     */
    private List<CartItemResponse> putItem(Long userId, List<CartItemResponse> cart, Long productId, int quantity) {
        ProductSnapshot product = productClient.fetch(productId);
        checkProductOnSale(product);
        checkEnoughStock(product, quantity);

        List<CartItemResponse> newCart = replaceOrAdd(cart, toCartItem(product, quantity));
        saveCart(userId, newCart);
        return newCart;
    }

    /** Sản phẩm phải đang mở bán và cửa hàng phải đang hoạt động. */
    private void checkProductOnSale(ProductSnapshot product) {
        if (!"ACTIVE".equals(product.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sản phẩm hiện không bán");
        }
        if (product.hiddenByStore()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cửa hàng bán sản phẩm này đang tạm ngưng hoạt động");
        }
    }

    private void checkEnoughStock(ProductSnapshot product, int quantity) {
        if (quantity > product.stockQuantity()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Chỉ còn " + product.stockQuantity() + " sản phẩm trong kho");
        }
    }

    /** Số lượng của một sản phẩm đang có trong giỏ, chưa có thì trả về 0. */
    private int quantityInCart(List<CartItemResponse> cart, Long productId) {
        for (CartItemResponse item : cart) {
            if (item.productId().equals(productId)) {
                return item.quantity();
            }
        }
        return 0;
    }

    /**
     * Tạo danh sách mới: sản phẩm đã có trong giỏ thì thay dòng cũ tại đúng vị trí,
     * chưa có thì thêm vào cuối. Giữ nguyên thứ tự để dòng hàng không nhảy chỗ trên giao diện.
     */
    private List<CartItemResponse> replaceOrAdd(List<CartItemResponse> cart, CartItemResponse newItem) {
        List<CartItemResponse> result = new ArrayList<>();
        boolean replaced = false;
        for (CartItemResponse item : cart) {
            if (item.productId().equals(newItem.productId())) {
                result.add(newItem);
                replaced = true;
            } else {
                result.add(item);
            }
        }
        if (!replaced) {
            result.add(newItem);
        }
        return result;
    }

    /** Chuyển thông tin sản phẩm lấy từ product-service thành một dòng hàng trong giỏ. */
    private CartItemResponse toCartItem(ProductSnapshot product, int quantity) {
        return new CartItemResponse(product.id(), product.storeId(), product.name(), product.sellingPrice(),
                product.price(), product.discountPercent(), quantity, product.stockQuantity(), product.imageUrl());
    }

    private void saveCart(Long userId, List<CartItemResponse> cart) {
        try {
            redisTemplate.opsForValue().set(cartKey(userId), objectMapper.writeValueAsString(cart), CART_TTL);
        } catch (Exception exception) {
            throw new IllegalStateException("Không lưu được giỏ hàng", exception);
        }
    }

    /** Mỗi người mua một khoá riêng trong Redis, ví dụ cart:3. */
    private String cartKey(Long userId) {
        return "cart:" + userId;
    }
}
