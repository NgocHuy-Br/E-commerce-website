package order_service.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import order_service.dto.CartItemRequest;
import order_service.dto.CartItemResponse;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class CartService {

    private static final TypeReference<List<CartItemResponse>> CART_TYPE = new TypeReference<>() {
    };
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public CartService(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public List<CartItemResponse> getCart(Long userId) {
        String value = redisTemplate.opsForValue().get(key(userId));
        if (value == null)
            return List.of();
        try {
            return objectMapper.readValue(value, CART_TYPE);
        } catch (Exception exception) {
            throw new IllegalStateException("Could not read cart", exception);
        }
    }

    public List<CartItemResponse> addItem(Long userId, CartItemRequest request) {
        List<CartItemResponse> cart = new ArrayList<>(getCart(userId));
        for (int index = 0; index < cart.size(); index++) {
            CartItemResponse item = cart.get(index);
            if (item.productId().equals(request.productId())) {
                cart.set(index, new CartItemResponse(item.productId(), request.productName(), request.unitPrice(),
                        item.quantity() + request.quantity()));
                saveCart(userId, cart);
                return cart;
            }
        }
        cart.add(new CartItemResponse(request.productId(), request.productName(), request.unitPrice(),
                request.quantity()));
        saveCart(userId, cart);
        return cart;
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

    private void saveCart(Long userId, List<CartItemResponse> cart) {
        try {
            redisTemplate.opsForValue().set(key(userId), objectMapper.writeValueAsString(cart));
        } catch (Exception exception) {
            throw new IllegalStateException("Could not save cart", exception);
        }
    }

    private String key(Long userId) {
        return "cart:" + userId;
    }
}