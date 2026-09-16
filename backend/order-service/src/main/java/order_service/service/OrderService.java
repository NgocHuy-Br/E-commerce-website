package order_service.service;

import java.util.List;
import order_service.dto.CartItemResponse;
import order_service.dto.CheckoutRequest;
import order_service.dto.OrderResponse;
import order_service.entity.CustomerOrder;
import order_service.entity.OrderItem;
import order_service.entity.OrderStatus;
import order_service.entity.PaymentStatus;
import order_service.entity.Voucher;
import order_service.repository.CustomerOrderRepository;
import order_service.repository.VoucherRepository;
import order_service.security.AuthPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OrderService {
    private final CartService cartService;
    private final CustomerOrderRepository orderRepository;
    private final ProductClient productClient;
    private final StoreClient storeClient;
    private final VoucherRepository voucherRepository;

    public OrderService(CartService cartService, CustomerOrderRepository orderRepository, ProductClient productClient,
            StoreClient storeClient, VoucherRepository voucherRepository) {
        this.cartService = cartService;
        this.orderRepository = orderRepository;
        this.productClient = productClient;
        this.storeClient = storeClient;
        this.voucherRepository = voucherRepository;
    }

    @Transactional
    public OrderResponse checkout(Long buyerId, CheckoutRequest request) {
        List<CartItemResponse> cart = cartService.getCart(buyerId);
        if (cart.isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart is empty");
        CustomerOrder order = new CustomerOrder(buyerId, request.shippingAddress(), request.paymentMethod());
        for (CartItemResponse item : cart) {
            ProductClient.ProductSnapshot product = productClient.reserve(item.productId(), item.quantity());
            order.addItem(new OrderItem(order, product.id(), product.storeId(), product.name(), product.price(),
                    item.quantity()));
        }
        applyVoucher(order, request.voucherCode());
        CustomerOrder saved = orderRepository.save(order);
        cartService.clearCart(buyerId);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getMine(Long buyerId) {
        return orderRepository.findAllByBuyerIdOrderByIdDesc(buyerId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public OrderResponse updateStatus(Long orderId, OrderStatus status, AuthPrincipal principal, String authorization) {
        CustomerOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        if (!principal.roles().contains("ADMIN"))
            order.getItems().stream().map(OrderItem::getStoreId).distinct()
                    .forEach(storeId -> storeClient.verifyOwner(storeId, authorization));
        order.setStatus(status);
        return toResponse(order);
    }

    @Transactional
    public OrderResponse pay(Long orderId, Long buyerId) {
        CustomerOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        if (!order.getBuyerId().equals(buyerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Order does not belong to buyer");
        }
        if (order.getPaymentStatus() != PaymentStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment is already completed or unavailable");
        }
        order.setPaymentStatus(PaymentStatus.PAID);
        return toResponse(order);
    }

    private OrderResponse toResponse(CustomerOrder order) {
        List<CartItemResponse> items = order.getItems().stream().map(item -> new CartItemResponse(item.getProductId(),
                item.getProductName(), item.getUnitPrice(), item.getQuantity())).toList();
        return new OrderResponse(order.getId(), order.getBuyerId(), order.getTotalAmount(), order.getShippingAddress(),
                order.getPaymentMethod(), order.getPaymentStatus(), order.getStatus(), items);
    }

    private void applyVoucher(CustomerOrder order, String voucherCode) {
        if (voucherCode == null || voucherCode.isBlank())
            return;
        Voucher voucher = voucherRepository.findByCodeIgnoreCase(voucherCode.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Voucher not found"));
        java.time.Instant now = java.time.Instant.now();
        if (voucher.getRemainingUses() < 1 || now.isBefore(voucher.getStartsAt()) || now.isAfter(voucher.getEndsAt())
                || order.getTotalAmount().compareTo(voucher.getMinimumOrderAmount()) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Voucher is not valid for this order");
        }
        voucher.use();
        order.applyVoucher(voucher);
    }
}