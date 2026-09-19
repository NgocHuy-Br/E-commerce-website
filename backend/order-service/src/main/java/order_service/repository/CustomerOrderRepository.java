package order_service.repository;

import java.util.List;
import order_service.entity.CustomerOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomerOrderRepository extends JpaRepository<CustomerOrder, Long> {

    List<CustomerOrder> findAllByBuyerIdOrderByIdDesc(Long buyerId);

    List<CustomerOrder> findAllByOrderByIdDesc();

    /** Đơn hàng có ít nhất một sản phẩm thuộc cửa hàng của người bán. */
    @Query("""
            select distinct customerOrder from CustomerOrder customerOrder
            join customerOrder.items item
            where item.storeId = :storeId
            order by customerOrder.id desc
            """)
    List<CustomerOrder> findAllByStoreId(@Param("storeId") Long storeId);
}
