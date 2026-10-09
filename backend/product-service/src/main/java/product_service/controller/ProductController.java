package product_service.controller;

import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import product_service.dto.CatalogStatsResponse;
import product_service.dto.CategoryRequest;
import product_service.dto.ProductRequest;
import product_service.dto.ProductResponse;
import product_service.dto.PromotionCampaignRequest;
import product_service.dto.PromotionCampaignResponse;
import product_service.dto.PromotionRequest;
import product_service.dto.PromotionResponse;
import product_service.entity.Category;
import product_service.entity.ProductStatus;
import product_service.security.AuthPrincipal;
import product_service.service.ProductService;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;
    private final String internalApiKey;

    public ProductController(ProductService productService, @Value("${app.internal.key}") String internalApiKey) {
        this.productService = productService;
        this.internalApiKey = internalApiKey;
    }

    /** Tìm kiếm hàng hoá theo từ khoá, danh mục, khoảng giá và sắp xếp. */
    @GetMapping
    public List<ProductResponse> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(defaultValue = "newest") String sort) {
        return productService.search(keyword, categoryId, minPrice, maxPrice, sortOf(sort));
    }

    @GetMapping("/{productId}")
    public ProductResponse getOne(@PathVariable Long productId) {
        return productService.getVisible(productId);
    }

    @GetMapping("/categories")
    public List<Category> getCategories() {
        return productService.getCategories();
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public Category createCategory(@Valid @RequestBody CategoryRequest request) {
        return productService.createCategory(request);
    }

    @PutMapping("/categories/{categoryId}")
    @PreAuthorize("hasRole('ADMIN')")
    public Category updateCategory(@PathVariable Long categoryId, @Valid @RequestBody CategoryRequest request) {
        return productService.updateCategory(categoryId, request);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('SELLER')")
    public ProductResponse create(@AuthenticationPrincipal AuthPrincipal principal,
            @RequestHeader("Authorization") String authorization,
            @Valid @RequestBody ProductRequest request) {
        return productService.create(principal, request, authorization);
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('SELLER')")
    public List<ProductResponse> mine(@AuthenticationPrincipal AuthPrincipal principal) {
        return productService.getBySeller(principal.userId());
    }

    @PutMapping("/{productId}")
    @PreAuthorize("hasRole('SELLER')")
    public ProductResponse update(@PathVariable Long productId, @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody ProductRequest request) {
        return productService.update(productId, principal.userId(), request);
    }

    /** Người bán tự ẩn hoặc hiện lại sản phẩm của mình. */
    @PutMapping("/{productId}/visibility")
    @PreAuthorize("hasRole('SELLER')")
    public ProductResponse updateVisibility(@PathVariable Long productId,
            @AuthenticationPrincipal AuthPrincipal principal, @RequestParam boolean visible) {
        return productService.updateVisibility(productId, principal.userId(), visible);
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public List<ProductResponse> getForAdmin(@RequestParam(required = false) ProductStatus status) {
        return productService.getForAdmin(status);
    }

    @GetMapping("/admin/statistics")
    @PreAuthorize("hasRole('ADMIN')")
    public CatalogStatsResponse getStatistics() {
        return productService.getStatistics();
    }

    @PutMapping("/{productId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ProductResponse updateStatus(@PathVariable Long productId, @RequestParam ProductStatus status) {
        return productService.updateStatus(productId, status);
    }

    @PutMapping("/internal/{productId}/reserve")
    public ProductResponse reserveStock(@PathVariable Long productId, @RequestParam int quantity,
            @RequestHeader("X-Internal-Key") String requestKey) {
        verifyInternalKey(requestKey);
        return productService.reserveStock(productId, quantity);
    }

    /** Hoàn kho khi đơn hàng bị huỷ. */
    @PutMapping("/internal/{productId}/release")
    public ProductResponse releaseStock(@PathVariable Long productId, @RequestParam int quantity,
            @RequestHeader("X-Internal-Key") String requestKey) {
        verifyInternalKey(requestKey);
        return productService.releaseStock(productId, quantity);
    }

    /**
     * Quản trị viên tạm ngưng hoặc duyệt lại cửa hàng thì ẩn/mở toàn bộ sản phẩm
     * của cửa hàng đó.
     */
    @PutMapping("/internal/store/{storeId}/visibility")
    public java.util.Map<String, Object> setStoreVisibility(@PathVariable Long storeId,
            @RequestParam boolean visible, @RequestHeader("X-Internal-Key") String requestKey) {
        verifyInternalKey(requestKey);
        int affected = productService.setStoreVisibility(storeId, visible);
        return java.util.Map.of("storeId", storeId, "visible", visible, "affectedProducts", affected);
    }

    @GetMapping("/{productId}/promotions")
    public List<PromotionResponse> getPromotions(@PathVariable Long productId) {
        return productService.getPromotions(productId);
    }

    @GetMapping("/mine/promotions")
    @PreAuthorize("hasRole('SELLER')")
    public List<PromotionCampaignResponse> getMyPromotions(@AuthenticationPrincipal AuthPrincipal principal) {
        return productService.getPromotionsBySeller(principal.userId());
    }

    @PostMapping("/promotions/campaigns")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('SELLER')")
    public PromotionCampaignResponse createPromotionCampaign(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody PromotionCampaignRequest request) {
        return productService.createPromotionCampaign(principal.userId(), request);
    }

    @DeleteMapping("/promotions/campaigns/{campaignId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('SELLER')")
    public void cancelPromotionCampaign(@PathVariable String campaignId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        productService.cancelPromotionCampaign(campaignId, principal.userId());
    }

    @PostMapping("/{productId}/promotions")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('SELLER')")
    public PromotionResponse createPromotion(@PathVariable Long productId,
            @AuthenticationPrincipal AuthPrincipal principal, @Valid @RequestBody PromotionRequest request) {
        return productService.createPromotion(productId, principal.userId(), request);
    }

    @DeleteMapping("/promotions/{promotionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('SELLER')")
    public void deletePromotion(@PathVariable Long promotionId, @AuthenticationPrincipal AuthPrincipal principal) {
        productService.deletePromotion(promotionId, principal.userId());
    }

    private void verifyInternalKey(String requestKey) {
        if (!internalApiKey.equals(requestKey)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Khoá nội bộ không hợp lệ");
        }
    }

    private Sort sortOf(String sort) {
        return switch (sort) {
            case "price_asc" -> Sort.by(Sort.Direction.ASC, "price");
            case "price_desc" -> Sort.by(Sort.Direction.DESC, "price");
            case "name" -> Sort.by(Sort.Direction.ASC, "name");
            default -> Sort.by(Sort.Direction.DESC, "id");
        };
    }
}
