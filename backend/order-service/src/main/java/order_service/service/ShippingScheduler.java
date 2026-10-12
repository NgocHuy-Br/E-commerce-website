package order_service.service;

import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Giả lập vận chuyển: đơn SHIPPING tự chuyển sang DELIVERED sau một khoảng thời
 * gian cấu hình.
 */
@Component
public class ShippingScheduler {

    private static final Logger log = LoggerFactory.getLogger(ShippingScheduler.class);

    private final OrderService orderService;
    private final Duration autoDeliverAfter;

    public ShippingScheduler(OrderService orderService,
            @Value("${app.shipping.auto-deliver-minutes:5}") long minutes) {
        this.orderService = orderService;
        this.autoDeliverAfter = Duration.ofMinutes(minutes);
    }

    @Scheduled(fixedDelay = 30_000)
    public void deliverShippedOrders() {
        int delivered = orderService.autoDeliver(autoDeliverAfter);
        if (delivered > 0) {
            log.info("Tự động giao thành công {} đơn hàng", delivered);
        }
    }
}
