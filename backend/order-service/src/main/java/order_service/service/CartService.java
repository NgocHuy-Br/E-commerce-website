package order_service.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import order_service.dto.CartChange;
import order_service.dto.CartItemRequest;
import order_service.dto.CartItemResponse;
import order_service.dto.CartRevalidationResponse;
import order_service.service.ProductClient.ProductSnapshot;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CartService {

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

    public List<CartItemResponse> getCart(Long userId) {
        String value = redisTemplate.opsForValue().get(key(userId));
        if (value == null)
            return List.of();
        try {
            return objectMapper.readValue(value, CART_TYPE);
        } catch (Exception exception) {
            throw new IllegalStateException("Không đọc được giỏ hàng", exception);
        }
    }

    /** Thêm sản phẩm vào giỏ; tên và giá luôn lấy từ product-service. */
    public List<CartItemResponse> addItem(Long userId, CartItemRequest request) {
        List<CartItemResponse> cart = new ArrayList<>(getCart(userId));
        int index = indexOf(cart, request.productId());
        int currentQuantity = index < 0 ? 0 : cart.get(index).quantity();
        return saveItem(userId, cart, request.productId(), currentQuantity + request.quantity());
    }

    /** Đặt lại số lượng của một dòng trong giỏ; quantity = 0 nghĩa là xoá. */
    public List<CartItemResponse> setQuantity(Long userId, Long productId, int quantity) {
        if (quantity < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số lượng không hợp lệ");
        }
        if (quantity == 0) {
            return removeItem(userId, productId);
        }
        List<CartItemResponse> cart = new ArrayList<>(getCart(userId));
        return saveItem(userId, cart, productId, quantity);
    }

    /**
     * Đối chiếu giỏ hàng với dữ liệu hiện tại của product-service.
     * Giá, tồn kho hoặc tình trạng bán có thể đã đổi từ lúc người mua thêm vào giỏ,
     * nên cần đồng bộ lại và báo cho người mua trước khi đặt hàng.
     */
    public CartRevalidationResponse revalidate(Long userId) {
        List<CartItemResponse> current = getCart(userId);
        List<CartItemResponse> synced = new ArrayList<>();
        List<CartChange> changes = new ArrayList<>();

        for (CartItemResponse item : current) {
            ProductSnapshot product;
            try {
                product = productClient.fetch(item.productId());
            } catch (RuntimeException exception) {
                changes.add(new CartChange(item.productId(), item.productName(), "REMOVED",
                        item.unitPrice(), null, item.quantity(), 0,
                        "Sản phẩm không còn tồn tại nên đã được bỏ khỏi giỏ hàng"));
                continue;
            }

            if (!"ACTIVE".equals(product.status()) || product.hiddenByStore()) {
                changes.add(new CartChange(item.productId(), item.productName(), "REMOVED",
                        item.unitPrice(), null, item.quantity(), 0,
                        "Sản phẩm đã ngừng bán nên đã được bỏ khỏi giỏ hàng"));
                continue;
            }

            if (product.stockQuantity() < 1) {
                changes.add(new CartChange(item.productId(), product.name(), "REMOVED",
                        item.unitPrice(), product.sellingPrice(), item.quantity(), 0,
                        "Sản phẩm đã hết hàng nên đã được bỏ khỏi giỏ hàng"));
                continue;
            }

            int quantity = Math.min(item.quantity(), product.stockQuantity());
            if (quantity != item.quantity()) {
                changes.add(new CartChange(item.productId(), product.name(), "QUANTITY_REDUCED",
                        item.unitPrice(), product.sellingPrice(), item.quantity(), quantity,
                        "Chỉ còn " + product.stockQuantity() + " sản phẩm nên số lượng đã được giảm xuống"));
            }
            if (product.sellingPrice().compareTo(item.unitPrice()) != 0) {
                changes.add(new CartChange(item.productId(), product.name(), "PRICE_CHANGED",
                        item.unitPrice(), product.sellingPrice(), item.quantity(), quantity,
                        "Giá đã thay đổi so với lúc bạn thêm vào giỏ hàng"));
            }

            synced.add(new CartItemResponse(product.id(), product.storeId(), product.name(),
                    product.sellingPrice(), product.price(), product.discountPercent(), quantity,
                    product.stockQuantity(), product.imageUrl()));
        }

        if (!changes.isEmpty()) {
            saveCart(userId, synced);
        }
        return new CartRevalidationResponse(synced, changes);
    }

    public List<CartItemResponse> removeItem(Long userId, Long productId) {
        List<CartItemResponse> cart = new ArrayList<>(getCart(userId));
        cart.removeIf(item -> item.productId().equals(productId));
        saveCart(userId, cart);
        return cart;
    }

    public void clearCart(Long userId) {
        redisTemplate.delete(key(userId));
    }

    private List<CartItemResponse> saveItem(Long userId, List<CartItemResponse> cart, Long productId, int quantity) {
        ProductSnapshot product = productClient.fetch(productId);
        if (!"ACTIVE".equals(product.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sản phẩm hiện không bán");
        }
        if (product.hiddenByStore()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cửa hàng bán sản phẩm này đang tạm ngưng hoạt động");
        }
        if (quantity > product.stockQuantity()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Chỉ còn " + product.stockQuantity() + " sản phẩm trong kho");
        }
        CartItemResponse item = new CartItemResponse(product.id(), product.storeId(), product.name(),
                product.sellingPrice(), product.price(), product.discountPercent(), quantity,
                product.stockQuantity(), product.imageUrl());
        int index = indexOf(cart, productId);
        if (index < 0) {
            cart.add(item);
        } else {
            cart.set(index, item);
        }
        saveCart(userId, cart);
        return cart;
    }

    private int indexOf(List<CartItemResponse> cart, Long productId) {
        for (int index = 0; index < cart.size(); index++) {
            if (cart.get(index).productId().equals(productId)) {
                return index;
            }
        }
        return -1;
    }

    private void saveCart(Long userId, List<CartItemResponse> cart) {
        try {
            redisTemplate.opsForValue().set(key(userId), objectMapper.writeValueAsString(cart), CART_TTL);
        } catch (Exception exception) {
            throw new IllegalStateException("Không lưu được giỏ hàng", exception);
        }
    }

    private String key(Long userId) {
        return "cart:" + userId;
    }
}
