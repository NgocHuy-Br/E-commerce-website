package product_service.dto;

import java.time.Instant;
import java.util.List;

public record PromotionCampaignResponse(
        String campaignId,
        String name,
        int discountPercent,
        Instant startsAt,
        Instant endsAt,
        boolean cancelled,
        List<ProductItem> products) {

    public record ProductItem(Long productId, String productName) {
    }
}
