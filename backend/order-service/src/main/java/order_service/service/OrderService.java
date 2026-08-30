package order_service.service;

import java.util.List;
import order_service.dto.CartItemResponse;
import order_service.dto.CheckoutRequest;
import order_service.dto.OrderResponse;
import order_service.entity.CustomerOrder;
import order_service.entity.OrderItem;
import order_service.entity.OrderStatus;
import order_service.repository.CustomerOrderRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OrderService {
    private final CartService cartService;
    private final CustomerOrderRepository orderRepository;

    public OrderService(CartService cartService, CustomerOrderRepository orderRepository) {
        this.cartService = cartService;
        this.orderRepository = orderRepository;
    }

    @Transactional
    public OrderResponse checkout(Long buyerId, CheckoutRequest request) {
        List<CartItemResponse> cart = cartService.getCart(buyerId);
        if (cart.isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart is empty");
        CustomerOrder order = new CustomerOrder(buyerId, request.shippingAddress(), request.paymentMethod());
        for (CartItemResponse item : cart)
            order.addItem(
                    new OrderItem(order, item.productId(), item.productName(), item.unitPrice(), item.quantity()));
        CustomerOrder saved = orderRepository.save(order);
        cartService.clearCart(buyerId);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getMine(Long buyerId) {
        return orderRepository.findAllByBuyerIdOrderByIdDesc(buyerId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public OrderResponse updateStatus(Long orderId, OrderStatus status) {
        CustomerOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        order.setStatus(status);
        return toResponse(order);
    }

    private OrderResponse toResponse(CustomerOrder order) {
        List<CartItemResponse> items = order.getItems().stream().map(item -> new CartItemResponse(item.getProductId(),
                item.getProductName(), item.getUnitPrice(), item.getQuantity())).toList();
        return new OrderResponse(order.getId(), order.getBuyerId(), order.getTotalAmount(), order.getShippingAddress(),
                order.getPaymentMethod(), order.getStatus(), items);
    }
}