package product_service.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import product_service.entity.Product;
import product_service.entity.ProductStatus;

public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findAllByStatusOrderByIdDesc(ProductStatus status);

    List<Product> findAllBySellerIdOrderByIdDesc(Long sellerId);

    List<Product> findAllByOrderByIdDesc();

    Optional<Product> findByIdAndSellerId(Long id, Long sellerId);

    long countByStatus(ProductStatus status);

    @Query("""
            select product from Product product
            where product.status = :status
              and (:keyword is null or lower(product.name) like lower(concat('%', :keyword, '%')))
              and (:categoryId is null or product.category.id = :categoryId)
              and (:minPrice is null or product.price >= :minPrice)
              and (:maxPrice is null or product.price <= :maxPrice)
            """)
    List<Product> search(
            @Param("status") ProductStatus status,
            @Param("keyword") String keyword,
            @Param("categoryId") Long categoryId,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            Sort sort);
}
