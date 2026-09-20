package order_service.controller;

import jakarta.validation.Valid;
import java.util.List;
import order_service.dto.CheckoutRequest;
import order_service.dto.OrderResponse;
import order_service.dto.PaymentRequest;
import order_service.dto.PlatformOrderStatsResponse;
import order_service.entity.OrderStatus;
import order_service.security.AuthPrincipal;
import order_service.service.OrderService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    /** Đặt hàng. Giỏ hàng nhiều cửa hàng sẽ tạo nhiều đơn nên kết quả là một danh sách. */
    @PostMapping("/checkout")
    @PreAuthorize("hasRole('BUYER')")
    public List<OrderResponse> checkout(@AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody CheckoutRequest request) {
        return orderService.checkout(principal.userId(), request);
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('BUYER')")
    public List<OrderResponse> mine(@AuthenticationPrincipal AuthPrincipal principal) {
        return orderService.getMine(principal.userId());
    }

    /** Danh sách đơn hàng của cửa hàng người bán đang đăng nhập. */
    @GetMapping("/seller")
    @PreAuthorize("hasRole('SELLER')")
    public List<OrderResponse> forSeller(@RequestHeader("Authorization") String authorization) {
        return orderService.getForSeller(authorization);
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public List<OrderResponse> forAdmin() {
        return orderService.getForAdmin();
    }

    @GetMapping("/admin/statistics")
    @PreAuthorize("hasRole('ADMIN')")
    public PlatformOrderStatsResponse statistics() {
        return orderService.getStatistics();
    }

    @PutMapping("/{orderId}/status")
    @PreAuthorize("hasAnyRole('SELLER','ADMIN')")
    public OrderResponse updateStatus(@PathVariable Long orderId, @RequestParam OrderStatus status,
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestHeader("Authorization") String authorization) {
        return orderService.updateStatus(orderId, status, principal, authorization);
    }

    /** Thanh toán đơn hàng với phương thức người mua chọn. */
    @PutMapping("/{orderId}/pay")
    @PreAuthorize("hasRole('BUYER')")
    public OrderResponse pay(@PathVariable Long orderId, @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody PaymentRequest request) {
        return orderService.pay(orderId, principal.userId(), request.paymentMethod());
    }

    /** Người mua huỷ đơn khi shop chưa giao. */
    @PutMapping("/{orderId}/cancel")
    @PreAuthorize("hasRole('BUYER')")
    public OrderResponse cancel(@PathVariable Long orderId, @AuthenticationPrincipal AuthPrincipal principal) {
        return orderService.cancel(orderId, principal.userId());
    }
}
