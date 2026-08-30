package order_service.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import order_service.entity.Review;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    boolean existsByOrderIdAndProductId(Long orderId, Long productId);

    List<Review> findAllByProductIdOrderByIdDesc(Long productId);
}