package order_service.dto;

import java.math.BigDecimal;
import java.util.Map;

public record PlatformOrderStatsResponse(
                long totalOrders,
                BigDecimal totalRevenue,
                long paidOrders,
                long deliveredOrders,
                long cancelledOrders,
                long totalReviews,
                double averageRating,
                BigDecimal platformCommission,
                Map<String, Long> ordersByStatus) {
}
