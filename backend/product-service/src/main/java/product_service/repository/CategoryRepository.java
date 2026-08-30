package product_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import product_service.entity.Category;

public interface CategoryRepository extends JpaRepository<Category, Long> {
}
