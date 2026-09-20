package order_service.controller;

import jakarta.validation.Valid;
import java.util.List;
import order_service.dto.CartItemRequest;
import order_service.dto.CartItemResponse;
import order_service.dto.CartRevalidationResponse;
import order_service.security.AuthPrincipal;
import order_service.service.CartService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders/cart")
@PreAuthorize("hasRole('BUYER')")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    public List<CartItemResponse> getCart(@AuthenticationPrincipal AuthPrincipal principal) {
        return cartService.getCart(principal.userId());
    }

    @PostMapping("/items")
    public List<CartItemResponse> addItem(@AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody CartItemRequest request) {
        return cartService.addItem(principal.userId(), request);
    }

    /** Cập nhật số lượng của một dòng trong giỏ. */
    @PutMapping("/items/{productId}")
    public List<CartItemResponse> setQuantity(@AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long productId, @RequestParam int quantity) {
        return cartService.setQuantity(principal.userId(), productId, quantity);
    }

    /** Đối chiếu giỏ hàng với giá và tồn kho hiện tại, trả về danh sách thay đổi (nếu có). */
    @PostMapping("/revalidate")
    public CartRevalidationResponse revalidate(@AuthenticationPrincipal AuthPrincipal principal) {
        return cartService.revalidate(principal.userId());
    }

    @DeleteMapping("/items/{productId}")
    public List<CartItemResponse> removeItem(@AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long productId) {
        return cartService.removeItem(principal.userId(), productId);
    }

    @DeleteMapping
    public void clearCart(@AuthenticationPrincipal AuthPrincipal principal) {
        cartService.clearCart(principal.userId());
    }
}
