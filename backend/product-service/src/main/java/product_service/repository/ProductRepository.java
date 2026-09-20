package product_service.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import product_service.entity.Product;
import product_service.entity.ProductStatus;

public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findAllByStatusOrderByIdDesc(ProductStatus status);

    List<Product> findAllBySellerIdOrderByIdDesc(Long sellerId);

    List<Product> findAllByOrderByIdDesc();

    Optional<Product> findByIdAndSellerId(Long id, Long sellerId);

    List<Product> findAllByStoreId(Long storeId);

    /** Khoá dòng khi trừ hoặc hoàn kho để hai đơn hàng cùng lúc không bán vượt tồn. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select product from Product product where product.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") Long id);

    long countByStatus(ProductStatus status);

    @Query("""
            select product from Product product
            where product.status = :status and product.hiddenByStore = false
              and (:keyword is null or lower(product.name) like lower(concat('%', :keyword, '%')))
              and (:categoryId is null or product.category.id = :categoryId)
              and (:minPrice is null or product.price >= :minPrice)
              and (:maxPrice is null or product.price <= :maxPrice)
            """)
    Page<Product> search(
            @Param("status") ProductStatus status,
            @Param("keyword") String keyword,
            @Param("categoryId") Long categoryId,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            Pageable pageable);
}
