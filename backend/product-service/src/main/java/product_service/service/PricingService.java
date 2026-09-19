package product_service.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import product_service.repository.PromotionRepository;

/** Tính giá sau khuyến mãi đang chạy của sản phẩm. */
@Service
public class PricingService {

    private final PromotionRepository promotionRepository;

    public PricingService(PromotionRepository promotionRepository) {
        this.promotionRepository = promotionRepository;
    }

    /** Trả về map productId -> phần trăm giảm cao nhất đang có hiệu lực. */
    public Map<Long, Integer> activeDiscounts(Collection<Long> productIds) {
        if (productIds.isEmpty()) {
            return Map.of();
        }
        List<PromotionRepository.ActiveDiscount> discounts = promotionRepository.findActiveDiscounts(productIds,
                Instant.now());
        return discounts.stream().collect(Collectors.toMap(
                PromotionRepository.ActiveDiscount::getProductId,
                PromotionRepository.ActiveDiscount::getDiscountPercent,
                Integer::max));
    }

    public int activeDiscount(Long productId) {
        return activeDiscounts(List.of(productId)).getOrDefault(productId, 0);
    }

    public static BigDecimal effectivePrice(BigDecimal price, int discountPercent) {
        if (discountPercent <= 0) {
            return price;
        }
        BigDecimal discount = price.multiply(BigDecimal.valueOf(discountPercent))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        return price.subtract(discount);
    }
}
