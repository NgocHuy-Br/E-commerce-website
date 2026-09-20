package order_service.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
 * Ghi đơn hàng vào cơ sở dữ liệu. Tách riêng khỏi OrderService để việc gọi HTTP
 * sang product-service diễn ra ngoài transaction.
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
     * Giỏ hàng có sản phẩm của nhiều cửa hàng thì được tách thành nhiều đơn,
     * mỗi cửa hàng một đơn để người bán chỉ xử lý phần của mình.
     * Mã giảm giá áp cho cả giỏ nên được chia theo tỉ lệ giá trị từng đơn.
     */
    @Transactional
    public List<CustomerOrder> createOrders(Long buyerId, CheckoutRequest request,
            List<ReservedItem> reservedItems) {
        Map<Long, List<ReservedItem>> itemsByStore = groupByStore(reservedItems);
        BigDecimal cartTotal = reservedItems.stream()
                .map(item -> item.unitPrice().multiply(BigDecimal.valueOf(item.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Voucher voucher = resolveVoucher(request.voucherCode(), cartTotal);
        BigDecimal totalDiscount = voucher == null ? BigDecimal.ZERO
                : cartTotal.multiply(BigDecimal.valueOf(voucher.getDiscountPercent()))
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        List<CustomerOrder> orders = new ArrayList<>();
        BigDecimal allocated = BigDecimal.ZERO;
        int index = 0;
        for (Map.Entry<Long, List<ReservedItem>> entry : itemsByStore.entrySet()) {
            CustomerOrder order = new CustomerOrder(buyerId, entry.getKey(), request.shippingAddress(),
                    request.paymentMethod());
            for (ReservedItem item : entry.getValue()) {
                order.addItem(new OrderItem(order, item.productId(), item.storeId(), item.productName(),
                        item.unitPrice(), item.quantity()));
            }
            if (voucher != null) {
                boolean isLast = ++index == itemsByStore.size();
                // Đơn cuối nhận phần còn lại để tổng tiền giảm khớp tuyệt đối với mã giảm giá.
                BigDecimal share = isLast ? totalDiscount.subtract(allocated)
                        : totalDiscount.multiply(order.getTotalAmount())
                                .divide(cartTotal, 2, RoundingMode.DOWN);
                allocated = allocated.add(share);
                order.applyDiscount(voucher.getCode(), share);
            }
            orders.add(order);
        }
        if (voucher != null) {
            voucher.use();
        }
        return orderRepository.saveAll(orders);
    }

    /** Giữ nguyên thứ tự cửa hàng theo thứ tự sản phẩm trong giỏ. */
    private Map<Long, List<ReservedItem>> groupByStore(List<ReservedItem> reservedItems) {
        Map<Long, List<ReservedItem>> grouped = new LinkedHashMap<>();
        for (ReservedItem item : reservedItems) {
            grouped.computeIfAbsent(item.storeId(), key -> new ArrayList<>()).add(item);
        }
        return grouped;
    }

    private Voucher resolveVoucher(String voucherCode, BigDecimal cartTotal) {
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
