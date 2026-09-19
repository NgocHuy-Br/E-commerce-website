package order_service.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import order_service.dto.CartItemResponse;
import order_service.dto.CheckoutRequest;
import order_service.dto.OrderItemResponse;
import order_service.dto.OrderResponse;
import order_service.dto.PlatformOrderStatsResponse;
import order_service.entity.CustomerOrder;
import order_service.entity.OrderItem;
import order_service.entity.OrderStatus;
import order_service.entity.PaymentMethod;
import order_service.entity.Review;
import order_service.entity.PaymentStatus;
import order_service.entity.Voucher;
import order_service.repository.CustomerOrderRepository;
import order_service.repository.ReviewRepository;
import order_service.repository.VoucherRepository;
import order_service.security.AuthPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    /** Các bước chuyển trạng thái đơn hàng được phép. */
    private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED_TRANSITIONS = Map.of(
            OrderStatus.PENDING, Set.of(OrderStatus.CONFIRMED, OrderStatus.CANCELLED),
            OrderStatus.CONFIRMED, Set.of(OrderStatus.PACKING, OrderStatus.CANCELLED),
            OrderStatus.PACKING, Set.of(OrderStatus.SHIPPING, OrderStatus.CANCELLED),
            OrderStatus.SHIPPING, Set.of(OrderStatus.DELIVERED),
            OrderStatus.DELIVERED, Set.of(),
            OrderStatus.CANCELLED, Set.of());

    private final CartService cartService;
    private final CustomerOrderRepository orderRepository;
    private final ProductClient productClient;
    private final StoreClient storeClient;
    private final VoucherRepository voucherRepository;
    private final ReviewRepository reviewRepository;

    public OrderService(CartService cartService, CustomerOrderRepository orderRepository, ProductClient productClient,
            StoreClient storeClient, VoucherRepository voucherRepository, ReviewRepository reviewRepository) {
        this.cartService = cartService;
        this.orderRepository = orderRepository;
        this.productClient = productClient;
        this.storeClient = storeClient;
        this.voucherRepository = voucherRepository;
        this.reviewRepository = reviewRepository;
    }

    @Transactional
    public OrderResponse checkout(Long buyerId, CheckoutRequest request) {
        List<CartItemResponse> cart = cartService.getCart(buyerId);
        if (cart.isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giỏ hàng đang trống");
        CustomerOrder order = new CustomerOrder(buyerId, request.shippingAddress(), request.paymentMethod());
        List<CartItemResponse> reserved = new ArrayList<>();
        try {
            for (CartItemResponse item : cart) {
                ProductClient.ProductSnapshot product = productClient.reserve(item.productId(), item.quantity());
                reserved.add(item);
                order.addItem(new OrderItem(order, product.id(), product.storeId(), product.name(),
                        product.sellingPrice(), item.quantity()));
            }
            applyVoucher(order, request.voucherCode());
        } catch (RuntimeException exception) {
            // Đơn không được tạo nên phải hoàn lại phần kho đã trừ của các sản phẩm trước đó.
            releaseQuietly(reserved);
            throw exception;
        }
        CustomerOrder saved = orderRepository.save(order);
        cartService.clearCart(buyerId);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getMine(Long buyerId) {
        return toResponses(orderRepository.findAllByBuyerIdOrderByIdDesc(buyerId));
    }

    /** Đơn hàng thuộc cửa hàng của người bán đang đăng nhập. */
    @Transactional(readOnly = true)
    public List<OrderResponse> getForSeller(String authorization) {
        Long storeId = storeClient.myStore(authorization).id();
        return toResponses(orderRepository.findAllByStoreId(storeId));
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getForAdmin() {
        return toResponses(orderRepository.findAllByOrderByIdDesc());
    }

    @Transactional(readOnly = true)
    public PlatformOrderStatsResponse getStatistics() {
        List<CustomerOrder> orders = orderRepository.findAll();
        BigDecimal revenue = orders.stream()
                .filter(order -> order.getStatus() != OrderStatus.CANCELLED)
                .map(CustomerOrder::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, Long> byStatus = orders.stream()
                .collect(Collectors.groupingBy(order -> order.getStatus().name(), Collectors.counting()));
        return new PlatformOrderStatsResponse(
                orders.size(),
                revenue,
                orders.stream().filter(order -> order.getPaymentStatus() == PaymentStatus.PAID).count(),
                orders.stream().filter(order -> order.getStatus() == OrderStatus.DELIVERED).count(),
                orders.stream().filter(order -> order.getStatus() == OrderStatus.CANCELLED).count(),
                reviewRepository.count(),
                reviewRepository.averageRating(),
                byStatus);
    }

    @Transactional
    public OrderResponse updateStatus(Long orderId, OrderStatus status, AuthPrincipal principal,
            String authorization) {
        CustomerOrder order = findOrder(orderId);
        if (!principal.roles().contains("ADMIN")) {
            Long storeId = storeClient.myStore(authorization).id();
            boolean ownsAnyItem = order.getItems().stream()
                    .anyMatch(item -> item.getStoreId().equals(storeId));
            if (!ownsAnyItem) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Đơn hàng không thuộc cửa hàng của bạn");
            }
        }
        changeStatus(order, status);
        return toResponse(order);
    }

    /** Người mua huỷ đơn khi shop chưa giao; hàng được hoàn lại kho. */
    @Transactional
    public OrderResponse cancel(Long orderId, Long buyerId) {
        CustomerOrder order = findOrder(orderId);
        if (!order.getBuyerId().equals(buyerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Đơn hàng không thuộc về bạn");
        }
        if (order.getStatus() == OrderStatus.DELIVERED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Đơn hàng đã được giao nên không thể huỷ");
        }
        if (order.getStatus() == OrderStatus.SHIPPING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Đơn hàng đang trên đường giao nên không thể huỷ");
        }
        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn hàng đã được huỷ trước đó");
        }
        changeStatus(order, OrderStatus.CANCELLED);
        return toResponse(order);
    }

    /** Người mua chọn phương thức rồi thanh toán đơn đang chờ trả tiền. */
    @Transactional
    public OrderResponse pay(Long orderId, Long buyerId, PaymentMethod paymentMethod) {
        CustomerOrder order = findOrder(orderId);
        if (!order.getBuyerId().equals(buyerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Đơn hàng không thuộc về bạn");
        }
        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn hàng đã bị huỷ, không thể thanh toán");
        }
        if (order.getPaymentStatus() != PaymentStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn hàng này đã được thanh toán");
        }
        order.setPaymentMethod(paymentMethod);
        order.setPaymentStatus(PaymentStatus.PAID);
        return toResponse(order);
    }

    private void changeStatus(CustomerOrder order, OrderStatus status) {
        if (order.getStatus() == status) {
            return;
        }
        if (!ALLOWED_TRANSITIONS.getOrDefault(order.getStatus(), Set.of()).contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Không thể chuyển đơn hàng từ " + order.getStatus() + " sang " + status);
        }
        order.setStatus(status);
        if (status == OrderStatus.CANCELLED) {
            order.getItems().forEach(item -> productClient.release(item.getProductId(), item.getQuantity()));
            if (order.getPaymentStatus() == PaymentStatus.PAID) {
                order.setPaymentStatus(PaymentStatus.REFUNDED);
            }
        }
    }

    /** Hoàn kho best-effort khi đặt hàng thất bại giữa chừng. */
    private void releaseQuietly(List<CartItemResponse> items) {
        for (CartItemResponse item : items) {
            try {
                productClient.release(item.productId(), item.quantity());
            } catch (RuntimeException exception) {
                log.error("Không hoàn được kho sản phẩm {} số lượng {}", item.productId(), item.quantity(),
                        exception);
            }
        }
    }

    private CustomerOrder findOrder(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng"));
    }

    private List<OrderResponse> toResponses(List<CustomerOrder> orders) {
        if (orders.isEmpty()) {
            return List.of();
        }
        Map<Long, Set<Long>> reviewedByOrder = reviewedProductIdsByOrder(
                orders.stream().map(CustomerOrder::getId).toList());
        return orders.stream()
                .map(order -> toResponse(order, reviewedByOrder.getOrDefault(order.getId(), Set.of())))
                .toList();
    }

    private Map<Long, Set<Long>> reviewedProductIdsByOrder(List<Long> orderIds) {
        return reviewRepository.findAllByOrderIdIn(orderIds).stream()
                .collect(Collectors.groupingBy(review -> review.getOrder().getId(),
                        Collectors.mapping(Review::getProductId, Collectors.toSet())));
    }

    private OrderResponse toResponse(CustomerOrder order) {
        Set<Long> reviewed = order.getId() == null ? Set.of()
                : reviewedProductIdsByOrder(List.of(order.getId())).getOrDefault(order.getId(), Set.of());
        return toResponse(order, reviewed);
    }

    private OrderResponse toResponse(CustomerOrder order, Set<Long> reviewedProductIds) {
        List<OrderItemResponse> items = order.getItems().stream()
                .map(item -> new OrderItemResponse(item.getProductId(), item.getStoreId(), item.getProductName(),
                        item.getUnitPrice(), item.getQuantity(), reviewedProductIds.contains(item.getProductId())))
                .toList();
        return new OrderResponse(order.getId(), order.getBuyerId(), order.getTotalAmount(), order.getDiscountAmount(),
                order.getVoucherCode(), order.getShippingAddress(), order.getPaymentMethod(), order.getPaymentStatus(),
                order.getStatus(), order.getCreatedAt(), items);
    }

    private void applyVoucher(CustomerOrder order, String voucherCode) {
        if (voucherCode == null || voucherCode.isBlank())
            return;
        Voucher voucher = voucherRepository.findByCodeIgnoreCase(voucherCode.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không tìm thấy mã giảm giá"));
        Instant now = Instant.now();
        if (voucher.getRemainingUses() < 1 || now.isBefore(voucher.getStartsAt()) || now.isAfter(voucher.getEndsAt())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã giảm giá đã hết hạn hoặc hết lượt dùng");
        }
        if (order.getTotalAmount().compareTo(voucher.getMinimumOrderAmount()) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Đơn hàng chưa đạt giá trị tối thiểu để dùng mã này");
        }
        voucher.use();
        order.applyVoucher(voucher);
    }
}
