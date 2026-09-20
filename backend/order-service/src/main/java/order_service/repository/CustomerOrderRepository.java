package order_service.repository;

import java.math.BigDecimal;
import java.util.List;
import order_service.entity.CustomerOrder;
import order_service.entity.OrderStatus;
import order_service.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomerOrderRepository extends JpaRepository<CustomerOrder, Long> {

    List<CustomerOrder> findAllByBuyerIdOrderByIdDesc(Long buyerId);

    List<CustomerOrder> findAllByOrderByIdDesc();

    /** Mỗi đơn chỉ thuộc một cửa hàng nên người bán chỉ cần lọc theo storeId. */
    List<CustomerOrder> findAllByStoreIdOrderByIdDesc(Long storeId);

    long countByStatus(OrderStatus status);

    long countByPaymentStatus(PaymentStatus paymentStatus);

    /** Tính doanh thu bằng truy vấn tổng hợp, không nạp toàn bộ đơn hàng vào bộ nhớ. */
    @Query("select coalesce(sum(customerOrder.totalAmount), 0) from CustomerOrder customerOrder "
            + "where customerOrder.status <> :excludedStatus")
    BigDecimal sumRevenueExcludingStatus(@Param("excludedStatus") OrderStatus excludedStatus);

    @Query("select customerOrder.status as status, count(customerOrder) as total "
            + "from CustomerOrder customerOrder group by customerOrder.status")
    List<StatusCount> countGroupedByStatus();

    interface StatusCount {
        OrderStatus getStatus();

        Long getTotal();
    }
}
