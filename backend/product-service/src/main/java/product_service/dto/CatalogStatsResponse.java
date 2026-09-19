package product_service.dto;

public record CatalogStatsResponse(
        long totalProducts,
        long activeProducts,
        long hiddenProducts,
        long outOfStockProducts,
        long totalCategories,
        long activePromotions) {
}
