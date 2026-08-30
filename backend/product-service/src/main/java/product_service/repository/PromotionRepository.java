package product_service.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import product_service.entity.Promotion;

public interface PromotionRepository extends JpaRepository<Promotion, Long> {
    List<Promotion> findAllByProductIdOrderByStartsAtDesc(Long productId);
}
