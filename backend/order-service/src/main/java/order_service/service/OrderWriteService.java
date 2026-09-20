package order_service.service;

import java.time.Instant;
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
 * Chỉ chịu trách nhiệm ghi đơn hàng vào cơ sở dữ liệu.
 * Tách riêng để việc gọi HTTP sang product-service diễn ra ngoài transaction,
 * tránh giữ kết nối cơ sở dữ liệu trong lúc chờ service khác trả lời.
 */
@Service
public class OrderWriteService {

    private final CustomerOrderRepository orderRepository;
    private final VoucherRepository voucherRepository;

    public OrderWriteService(CustomerOrderRepository orderRepository, VoucherRepository voucherRepository) {
        this.orderRepository = orderRepository;
        this.voucherRepository = voucherRepository;
    }

    @Transactional
    public CustomerOrder createOrder(Long buyerId, CheckoutRequest request, List<ReservedItem> reservedItems) {
        CustomerOrder order = new CustomerOrder(buyerId, request.shippingAddress(), request.paymentMethod());
        for (ReservedItem item : reservedItems) {
            order.addItem(new OrderItem(order, item.productId(), item.storeId(), item.productName(),
                    item.unitPrice(), item.quantity()));
        }
        applyVoucher(order, request.voucherCode());
        return orderRepository.save(order);
    }

    private void applyVoucher(CustomerOrder order, String voucherCode) {
        if (voucherCode == null || voucherCode.isBlank()) {
            return;
        }
        // Khoá dòng mã giảm giá để hai đơn cùng lúc không dùng chung lượt cuối.
        Voucher voucher = voucherRepository.findByCodeForUpdate(voucherCode.trim())
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
