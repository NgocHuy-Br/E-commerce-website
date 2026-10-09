package product_service.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import product_service.entity.Promotion;

public interface PromotionRepository extends JpaRepository<Promotion, Long> {

    List<Promotion> findAllByProductIdOrderByStartsAtDesc(Long productId);

    List<Promotion> findAllByProductSellerIdOrderByIdDesc(Long sellerId);

    Optional<Promotion> findByIdAndProductSellerId(Long id, Long sellerId);

    List<Promotion> findAllByCampaignIdAndProductSellerIdOrderByIdAsc(String campaignId, Long sellerId);

    @Query("""
            select product.id as productId, max(promotion.discountPercent) as discountPercent
            from Promotion promotion join promotion.product product
                        where product.id in :productIds
                            and (promotion.cancelled = false or promotion.cancelled is null)
                            and promotion.startsAt <= :now and promotion.endsAt > :now
            group by product.id
            """)
    List<ActiveDiscount> findActiveDiscounts(
            @Param("productIds") Collection<Long> productIds,
            @Param("now") Instant now);

    interface ActiveDiscount {
        Long getProductId();

        Integer getDiscountPercent();
    }
}
