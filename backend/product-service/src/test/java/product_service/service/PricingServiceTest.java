package product_service.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import product_service.repository.PromotionRepository;

@ExtendWith(MockitoExtension.class)
class PricingServiceTest {

    @Mock
    private PromotionRepository promotionRepository;

    @InjectMocks
    private PricingService pricingService;

    @Test
    @DisplayName("Không có khuyến mãi thì giữ nguyên giá gốc")
    void noDiscountKeepsOriginalPrice() {
        assertThat(PricingService.effectivePrice(new BigDecimal("890000"), 0))
                .isEqualByComparingTo("890000");
    }

    @Test
    @DisplayName("Giảm 20% của 890.000 đồng còn 712.000 đồng")
    void appliesPercentDiscount() {
        assertThat(PricingService.effectivePrice(new BigDecimal("890000"), 20))
                .isEqualByComparingTo("712000");
    }

    @Test
    @DisplayName("Giá lẻ được làm tròn tới hai chữ số thập phân")
    void roundsToTwoDecimals() {
        assertThat(PricingService.effectivePrice(new BigDecimal("99999"), 15))
                .isEqualByComparingTo("84999.15");
    }

    @Test
    @DisplayName("Một sản phẩm có nhiều khuyến mãi thì lấy mức giảm cao nhất")
    void picksHighestDiscountAmongPromotions() {
        PromotionRepository.ActiveDiscount ten = discount(1L, 10);
        PromotionRepository.ActiveDiscount thirty = discount(1L, 30);
        when(promotionRepository.findActiveDiscounts(anyCollection(), any()))
                .thenReturn(List.of(ten, thirty));

        assertThat(pricingService.activeDiscount(1L)).isEqualTo(30);
    }

    @Test
    @DisplayName("Danh sách sản phẩm rỗng thì không truy vấn khuyến mãi")
    void emptyProductListSkipsQuery() {
        assertThat(pricingService.activeDiscounts(List.of())).isEmpty();
    }

    private PromotionRepository.ActiveDiscount discount(Long productId, Integer percent) {
        return new PromotionRepository.ActiveDiscount() {
            @Override
            public Long getProductId() {
                return productId;
            }

            @Override
            public Integer getDiscountPercent() {
                return percent;
            }
        };
    }
}
