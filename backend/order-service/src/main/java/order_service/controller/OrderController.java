package order_service.controller;

import jakarta.validation.Valid;
import java.util.List;
import order_service.dto.CheckoutRequest;
import order_service.dto.OrderResponse;
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

    @PostMapping("/checkout")
    @PreAuthorize("hasRole('BUYER')")
    public OrderResponse checkout(@AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody CheckoutRequest request) {
        return orderService.checkout(principal.userId(), request);
    }

    @GetMapping("/mine")
    public List<OrderResponse> mine(@AuthenticationPrincipal AuthPrincipal principal) {
        return orderService.getMine(principal.userId());
    }

    @PutMapping("/{orderId}/status")
    @PreAuthorize("hasAnyRole('SELLER','ADMIN')")
    public OrderResponse updateStatus(@PathVariable Long orderId, @RequestParam OrderStatus status,
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestHeader("Authorization") String authorization) {
        return orderService.updateStatus(orderId, status, principal, authorization);
    }

    @PutMapping("/{orderId}/pay")
    @PreAuthorize("hasRole('BUYER')")
    public OrderResponse pay(@PathVariable Long orderId, @AuthenticationPrincipal AuthPrincipal principal) {
        return orderService.pay(orderId, principal.userId());
    }
}