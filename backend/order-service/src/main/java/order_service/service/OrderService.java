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
import order_service.dto.ReservedItem;
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

    /** Từ khi đơn được giao cho vận chuyển (SHIPPING) trở đi thì không ai huỷ được nữa. */
    private static final Set<OrderStatus> CANCELLABLE_STATUSES = Set.of(
            OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PACKING);

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
    private final OrderWriteService orderWriteService;

    public OrderService(CartService cartService, CustomerOrderRepository orderRepository, ProductClient productClient,
            StoreClient storeClient, VoucherRepository voucherRepository, ReviewRepository reviewRepository,
            OrderWriteService orderWriteService) {
        this.cartService = cartService;
        this.orderRepository = orderRepository;
        this.productClient = productClient;
        this.storeClient = storeClient;
        this.voucherRepository = voucherRepository;
        this.reviewRepository = reviewRepository;
        this.orderWriteService = orderWriteService;
    }

    /**
     * Đặt hàng gồm bốn bước:
     * 1. Lấy giỏ hàng của người mua từ Redis.
     * 2. Gọi product-service trừ kho từng sản phẩm, đồng thời lấy giá chốt đơn.
     * 3. Ghi đơn hàng vào cơ sở dữ liệu (giỏ nhiều cửa hàng thì tách thành nhiều đơn).
     * 4. Xoá giỏ hàng.
     * Nếu bước 3 thất bại thì phần kho đã trừ ở bước 2 được hoàn lại.
     */
    public List<OrderResponse> checkout(Long buyerId, CheckoutRequest request) {
        // Bước 1
        List<CartItemResponse> cart = cartService.getCart(buyerId);
        if (cart.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giỏ hàng đang trống");
        }

        List<ReservedItem> reservedItems = new ArrayList<>();
        try {
            // Bước 2
            for (CartItemResponse item : cart) {
                reservedItems.add(reserveStock(item));
            }
            // Bước 3
            List<CustomerOrder> orders = orderWriteService.createOrders(buyerId, request, reservedItems);
            // Bước 4
            cartService.clearCart(buyerId);
            return orders.stream().map(this::toNewOrderResponse).toList();
        } catch (RuntimeException exception) {
            returnReservedStock(reservedItems);
            throw exception;
        }
    }

    /** Trừ kho một sản phẩm và lấy về giá chốt đơn do product-service quyết định. */
    private ReservedItem reserveStock(CartItemResponse cartItem) {
        ProductClient.ProductSnapshot product = productClient.reserve(cartItem.productId(), cartItem.quantity());
        return new ReservedItem(product.id(), product.storeId(), product.name(), product.sellingPrice(),
                cartItem.quantity());
    }

    /** Đơn vừa tạo nên chưa có sản phẩm nào được đánh giá. */
    private OrderResponse toNewOrderResponse(CustomerOrder order) {
        return toResponse(order, Set.of());
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getMine(Long buyerId) {
        return toResponses(orderRepository.findAllByBuyerIdOrderByIdDesc(buyerId));
    }

    /** Đơn hàng thuộc cửa hàng của người bán đang đăng nhập. */
    @Transactional(readOnly = true)
    public List<OrderResponse> getForSeller(String authorization) {
        Long storeId = storeClient.myStore(authorization).id();
        return toResponses(orderRepository.findAllByStoreIdOrderByIdDesc(storeId));
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getForAdmin() {
        return toResponses(orderRepository.findAllByOrderByIdDesc());
    }

    /** Thống kê bằng truy vấn tổng hợp, không nạp toàn bộ đơn hàng vào bộ nhớ. */
    @Transactional(readOnly = true)
    public PlatformOrderStatsResponse getStatistics() {
        Map<String, Long> byStatus = orderRepository.countGroupedByStatus().stream()
                .collect(Collectors.toMap(row -> row.getStatus().name(), CustomerOrderRepository.StatusCount::getTotal));
        return new PlatformOrderStatsResponse(
                orderRepository.count(),
                orderRepository.sumRevenueExcludingStatus(OrderStatus.CANCELLED),
                orderRepository.countByPaymentStatus(PaymentStatus.PAID),
                orderRepository.countByStatus(OrderStatus.DELIVERED),
                orderRepository.countByStatus(OrderStatus.CANCELLED),
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
            if (!storeId.equals(order.getStoreId())) {
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
        if (status == OrderStatus.CANCELLED) {
            ensureCancellable(order);
        }
        if (!ALLOWED_TRANSITIONS.getOrDefault(order.getStatus(), Set.of()).contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Không thể chuyển đơn hàng từ " + order.getStatus() + " sang " + status);
        }
        order.setStatus(status);
        if (status == OrderStatus.CANCELLED) {
            order.getItems().forEach(item -> productClient.release(item.getProductId(), item.getQuantity()));
            restoreVoucher(order);
            if (order.getPaymentStatus() == PaymentStatus.PAID) {
                order.setPaymentStatus(PaymentStatus.REFUNDED);
            }
        }
    }

    /**
     * Hoàn lại kho khi đặt hàng thất bại. Nếu việc hoàn kho cũng lỗi thì chỉ ghi log,
     * vì lúc này việc quan trọng hơn là trả lỗi đặt hàng về cho người mua.
     */
    private void returnReservedStock(List<ReservedItem> items) {
        for (ReservedItem item : items) {
            try {
                productClient.release(item.productId(), item.quantity());
            } catch (RuntimeException exception) {
                log.error("Không hoàn được kho sản phẩm {} số lượng {}", item.productId(), item.quantity(),
                        exception);
            }
        }
    }

    /** Đơn bị huỷ thì mã giảm giá đã dùng phải được trả lại một lượt. */
    private void restoreVoucher(CustomerOrder order) {
        if (order.getVoucherCode() == null || order.getVoucherCode().isBlank()) {
            return;
        }
        voucherRepository.findByCodeForUpdate(order.getVoucherCode())
                .ifPresentOrElse(Voucher::restore,
                        () -> log.warn("Không tìm thấy mã {} để hoàn lượt dùng cho đơn {}",
                                order.getVoucherCode(), order.getId()));
    }

    /** Thông báo rõ lý do khi đơn không còn huỷ được (áp dụng cho cả người mua, người bán và admin). */
    private void ensureCancellable(CustomerOrder order) {
        if (CANCELLABLE_STATUSES.contains(order.getStatus())) {
            return;
        }
        String reason = switch (order.getStatus()) {
            case SHIPPING -> "Đơn hàng đang trên đường giao nên không thể huỷ";
            case DELIVERED -> "Đơn hàng đã được giao nên không thể huỷ";
            case CANCELLED -> "Đơn hàng đã được huỷ trước đó";
            default -> "Đơn hàng không thể huỷ ở trạng thái hiện tại";
        };
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
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
        return new OrderResponse(order.getId(), order.getBuyerId(), order.getStoreId(), order.getTotalAmount(),
                order.getDiscountAmount(),
                order.getVoucherCode(), order.getShippingAddress(), order.getPaymentMethod(), order.getPaymentStatus(),
                order.getStatus(), order.getCreatedAt(), items);
    }

}
