package order_service.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
     * Giỏ hàng có sản phẩm của nhiều cửa hàng thì tách thành nhiều đơn, mỗi cửa hàng một đơn,
     * để người bán chỉ xử lý phần hàng của mình. Mã giảm giá theo phần trăm nên áp cho từng đơn.
     */
    @Transactional
    public List<CustomerOrder> createOrders(Long buyerId, CheckoutRequest request,
            List<ReservedItem> reservedItems) {
        Voucher voucher = findUsableVoucher(request.voucherCode(), totalOf(reservedItems));

        List<CustomerOrder> orders = new ArrayList<>();
        for (Map.Entry<Long, List<ReservedItem>> entry : groupByStore(reservedItems).entrySet()) {
            CustomerOrder order = new CustomerOrder(buyerId, entry.getKey(), request.shippingAddress(),
                    request.paymentMethod());
            for (ReservedItem item : entry.getValue()) {
                order.addItem(new OrderItem(order, item.productId(), item.storeId(), item.productName(),
                        item.unitPrice(), item.quantity()));
            }
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

    private java.math.BigDecimal totalOf(List<ReservedItem> items) {
        java.math.BigDecimal total = java.math.BigDecimal.ZERO;
        for (ReservedItem item : items) {
            total = total.add(item.unitPrice().multiply(java.math.BigDecimal.valueOf(item.quantity())));
        }
        return total;
    }

    /** Gom sản phẩm theo cửa hàng, giữ nguyên thứ tự trong giỏ hàng. */
    private Map<Long, List<ReservedItem>> groupByStore(List<ReservedItem> reservedItems) {
        Map<Long, List<ReservedItem>> grouped = new LinkedHashMap<>();
        for (ReservedItem item : reservedItems) {
            grouped.computeIfAbsent(item.storeId(), key -> new ArrayList<>()).add(item);
        }
        return grouped;
    }

    /** Trả về mã giảm giá nếu hợp lệ, trả về null nếu người mua không dùng mã. */
    private Voucher findUsableVoucher(String voucherCode, java.math.BigDecimal cartTotal) {
        if (voucherCode == null || voucherCode.isBlank()) {
            return null;
        }
        // Khoá dòng mã giảm giá để hai đơn cùng lúc không dùng chung lượt cuối.
        Voucher voucher = voucherRepository.findByCodeForUpdate(voucherCode.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không tìm thấy mã giảm giá"));
        Instant now = Instant.now();
        if (voucher.getRemainingUses() < 1 || now.isBefore(voucher.getStartsAt()) || now.isAfter(voucher.getEndsAt())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã giảm giá đã hết hạn hoặc hết lượt dùng");
        }
        if (cartTotal.compareTo(voucher.getMinimumOrderAmount()) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Đơn hàng chưa đạt giá trị tối thiểu để dùng mã này");
        }
        return voucher;
    }
}
