package order_service.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import order_service.dto.CheckoutRequest;
import order_service.dto.ReservedItem;
import order_service.entity.CustomerOrder;
import order_service.entity.OrderItem;
import order_service.entity.Voucher;
import order_service.repository.CustomerOrderRepository;
import order_service.repository.VoucherRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Ghi đơn hàng vào cơ sở dữ liệu.
 * Tách riêng khỏi OrderService để phần gọi HTTP sang product-service nằm ngoài transaction.
 */
@Service
public class OrderWriteService {

    private final CustomerOrderRepository orderRepository;
    private final VoucherRepository voucherRepository;

    public OrderWriteService(CustomerOrderRepository orderRepository, VoucherRepository voucherRepository) {
        this.orderRepository = orderRepository;
        this.voucherRepository = voucherRepository;
    }

    /**
     * Tạo đơn hàng từ những sản phẩm đã trừ kho.
     * Giỏ hàng có sản phẩm của nhiều cửa hàng thì tách thành nhiều đơn, mỗi cửa hàng một đơn.
     * Mã giảm giá tính theo phần trăm nên áp cho từng đơn là đủ.
     */
    @Transactional
    public List<CustomerOrder> createOrders(Long buyerId, CheckoutRequest request, List<ReservedItem> items) {
        Voucher voucher = findVoucher(request.voucherCode(), cartTotalOf(items));

        List<CustomerOrder> orders = new ArrayList<>();
        for (Long storeId : storeIdsOf(items)) {
            CustomerOrder order = createOrderForStore(buyerId, storeId, request, items);
            if (voucher != null) {
                order.applyVoucher(voucher);
            }
            orders.add(order);
        }

        if (voucher != null) {
            voucher.use();
        }
        return orderRepository.saveAll(orders);
    }

    /** Tạo một đơn cho một cửa hàng, gồm những dòng hàng của cửa hàng đó. */
    private CustomerOrder createOrderForStore(Long buyerId, Long storeId, CheckoutRequest request,
            List<ReservedItem> items) {
        CustomerOrder order = new CustomerOrder(buyerId, storeId, request.shippingAddress(),
                request.paymentMethod());
        for (ReservedItem item : itemsOfStore(items, storeId)) {
            order.addItem(new OrderItem(order, item.productId(), item.storeId(), item.productName(),
                    item.unitPrice(), item.quantity()));
        }
        return order;
    }

    /** Danh sách mã cửa hàng có trong giỏ, không trùng lặp. */
    private List<Long> storeIdsOf(List<ReservedItem> items) {
        return items.stream().map(ReservedItem::storeId).distinct().toList();
    }

    /** Những dòng hàng thuộc một cửa hàng. */
    private List<ReservedItem> itemsOfStore(List<ReservedItem> items, Long storeId) {
        return items.stream().filter(item -> item.storeId().equals(storeId)).toList();
    }

    /** Tổng tiền cả giỏ hàng, dùng để kiểm tra điều kiện của mã giảm giá. */
    private BigDecimal cartTotalOf(List<ReservedItem> items) {
        BigDecimal total = BigDecimal.ZERO;
        for (ReservedItem item : items) {
            total = total.add(item.lineTotal());
        }
        return total;
    }

    /** Trả về mã giảm giá đã kiểm tra hợp lệ, hoặc null nếu người mua không nhập mã. */
    private Voucher findVoucher(String voucherCode, BigDecimal cartTotal) {
        if (voucherCode == null || voucherCode.isBlank()) {
            return null;
        }
        // Khoá dòng mã giảm giá để hai đơn cùng lúc không dùng chung lượt cuối.
        Voucher voucher = voucherRepository.findByCodeForUpdate(voucherCode.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không tìm thấy mã giảm giá"));
        checkVoucherUsable(voucher, cartTotal);
        return voucher;
    }

    /** Mã giảm giá dùng được khi còn lượt, còn trong thời gian áp dụng và đơn đủ giá trị tối thiểu. */
    private void checkVoucherUsable(Voucher voucher, BigDecimal cartTotal) {
        if (voucher.getRemainingUses() < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã giảm giá đã hết lượt dùng");
        }
        Instant now = Instant.now();
        if (now.isBefore(voucher.getStartsAt()) || now.isAfter(voucher.getEndsAt())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã giảm giá không còn hiệu lực");
        }
        if (cartTotal.compareTo(voucher.getMinimumOrderAmount()) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Đơn hàng chưa đạt giá trị tối thiểu để dùng mã này");
        }
    }
}
