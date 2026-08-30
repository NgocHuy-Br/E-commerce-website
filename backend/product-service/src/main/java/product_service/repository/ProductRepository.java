package product_service.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import product_service.entity.Product;
import product_service.entity.ProductStatus;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByStatusAndNameContainingIgnoreCaseOrderByIdDesc(ProductStatus status, String keyword);

    List<Product> findAllByStatusOrderByIdDesc(ProductStatus status);

    List<Product> findAllBySellerIdOrderByIdDesc(Long sellerId);

    Optional<Product> findByIdAndSellerId(Long id, Long sellerId);
}
