package order_service.repository;

import java.util.Collection;
import java.util.List;
import order_service.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    boolean existsByOrderIdAndProductId(Long orderId, Long productId);

    List<Review> findAllByProductIdOrderByIdDesc(Long productId);

    List<Review> findAllByOrderIdIn(Collection<Long> orderIds);

    @Query("""
            select review.productId as productId, avg(review.rating) as averageRating, count(review) as reviewCount
            from Review review
            where review.productId in :productIds
            group by review.productId
            """)
    List<RatingSummary> summarizeByProductIds(@Param("productIds") Collection<Long> productIds);

    @Query("select coalesce(avg(review.rating), 0.0) from Review review")
    double averageRating();

    interface RatingSummary {
        Long getProductId();

        Double getAverageRating();

        Long getReviewCount();
    }
}
