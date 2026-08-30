package order_service.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import order_service.entity.CustomerOrder;

public interface CustomerOrderRepository extends JpaRepository<CustomerOrder, Long> {
    List<CustomerOrder> findAllByBuyerIdOrderByIdDesc(Long buyerId);
}