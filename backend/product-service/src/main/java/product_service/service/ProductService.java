package product_service.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
import product_service.entity.Product;
import product_service.entity.ProductStatus;
import product_service.entity.Promotion;
import product_service.repository.CategoryRepository;
import product_service.repository.ProductRepository;
import product_service.repository.PromotionRepository;
import product_service.security.AuthPrincipal;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final PromotionRepository promotionRepository;
    private final StoreVerificationClient storeVerificationClient;
    private final PricingService pricingService;

    public ProductService(ProductRepository productRepository, CategoryRepository categoryRepository,
            PromotionRepository promotionRepository, StoreVerificationClient storeVerificationClient,
            PricingService pricingService) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.promotionRepository = promotionRepository;
        this.storeVerificationClient = storeVerificationClient;
        this.pricingService = pricingService;
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> search(String keyword, Long categoryId, BigDecimal minPrice, BigDecimal maxPrice,
            org.springframework.data.domain.Sort sort) {
        String normalizedKeyword = keyword == null || keyword.isBlank() ? null : keyword.trim();
        return toResponses(productRepository.search(ProductStatus.ACTIVE, normalizedKeyword, categoryId, minPrice,
                maxPrice, sort));
    }

    @Transactional(readOnly = true)
    public ProductResponse getVisible(Long productId) {
        Product product = findProduct(productId);
        if (product.getStatus() == ProductStatus.HIDDEN || product.isHiddenByStore()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm");
        }
        return toResponse(product);
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> getBySeller(Long sellerId) {
        return toResponses(productRepository.findAllBySellerIdOrderByIdDesc(sellerId));
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> getForAdmin(ProductStatus status) {
        return toResponses(status == null ? productRepository.findAllByOrderByIdDesc()
                : productRepository.findAllByStatusOrderByIdDesc(status));
    }

    @Transactional(readOnly = true)
    public CatalogStatsResponse getStatistics() {
        List<Long> productIds = productRepository.findAllByOrderByIdDesc().stream().map(Product::getId).toList();
        return new CatalogStatsResponse(
                productIds.size(),
                productRepository.countByStatus(ProductStatus.ACTIVE),
                productRepository.countByStatus(ProductStatus.HIDDEN),
                productRepository.countByStatus(ProductStatus.OUT_OF_STOCK),
                categoryRepository.count(),
                pricingService.activeDiscounts(productIds).size());
    }

    @Transactional
    public ProductResponse create(AuthPrincipal principal, ProductRequest request, String authorization) {
        storeVerificationClient.verifyActiveOwner(request.storeId(), principal.userId(), authorization);
        Category category = findCategory(request.categoryId());
        return toResponse(productRepository.save(new Product(principal.userId(), request.storeId(), category,
                request.name(), request.description(), request.price(), request.stockQuantity(), request.imageUrl())));
    }

    @Transactional
    public ProductResponse update(Long productId, Long sellerId, ProductRequest request) {
        Product product = findOwnedProduct(productId, sellerId);
        product.update(findCategory(request.categoryId()), request.name(), request.description(), request.price(),
                request.stockQuantity(), request.imageUrl());
        return toResponse(product);
    }

    /** Người bán tự ẩn hoặc hiện lại sản phẩm của mình. */
    @Transactional
    public ProductResponse updateVisibility(Long productId, Long sellerId, boolean visible) {
        Product product = findOwnedProduct(productId, sellerId);
        if (visible && product.isHiddenByStore()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cửa hàng của bạn đang bị tạm ngưng nên chưa thể mở bán lại sản phẩm");
        }
        product.setStatus(visible ? (product.getStockQuantity() > 0 ? ProductStatus.ACTIVE : ProductStatus.OUT_OF_STOCK)
                : ProductStatus.HIDDEN);
        return toResponse(product);
    }

    @Transactional
    public ProductResponse updateStatus(Long productId, ProductStatus status) {
        Product product = findProduct(productId);
        product.setStatus(status);
        return toResponse(product);
    }

    @Transactional
    public ProductResponse reserveStock(Long productId, int quantity) {
        if (quantity < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số lượng phải lớn hơn 0");
        }
        // Khoá dòng sản phẩm để hai người mua cùng lúc không trừ kho trên cùng một giá
        // trị cũ.
        Product product = productRepository.findByIdForUpdate(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm"));
        try {
            product.decreaseStock(quantity);
        } catch (IllegalStateException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, unavailableMessage(product, exception));
        }
        return toResponse(product);
    }

    /** Phân biệt sản phẩm hết hàng với sản phẩm đã ngừng bán để thông báo đúng. */
    private String unavailableMessage(Product product, IllegalStateException exception) {
        if ("OUT_OF_STOCK".equals(exception.getMessage())) {
            return "Sản phẩm \"" + product.getName() + "\" chỉ còn " + product.getStockQuantity() + " sản phẩm";
        }
        if (product.isHiddenByStore()) {
            return "Cửa hàng bán sản phẩm \"" + product.getName() + "\" đang tạm ngưng hoạt động";
        }
        return "Sản phẩm \"" + product.getName() + "\" đã ngừng bán";
    }

    /** Hoàn kho khi đơn hàng bị huỷ. */
    @Transactional
    public ProductResponse releaseStock(Long productId, int quantity) {
        if (quantity < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số lượng phải lớn hơn 0");
        }
        Product product = productRepository.findByIdForUpdate(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm"));
        product.increaseStock(quantity);
        return toResponse(product);
    }

    /**
     * Ẩn hoặc mở lại toàn bộ sản phẩm của một cửa hàng.
     * Dùng khi quản trị viên tạm ngưng, từ chối hoặc duyệt lại cửa hàng đó.
     */
    @Transactional
    public int setStoreVisibility(Long storeId, boolean visible) {
        List<Product> products = productRepository.findAllByStoreId(storeId);
        products.forEach(product -> product.setHiddenByStore(!visible));
        return products.size();
    }

    @Transactional(readOnly = true)
    public List<Category> getCategories() {
        return categoryRepository.findAll();
    }

    @Transactional
    public Category createCategory(CategoryRequest request) {
        return categoryRepository.save(new Category(request.name(), request.description()));
    }

    @Transactional
    public Category updateCategory(Long categoryId, CategoryRequest request) {
        Category category = findCategory(categoryId);
        category.update(request.name(), request.description());
        return category;
    }

    @Transactional(readOnly = true)
    public List<PromotionResponse> getPromotions(Long productId) {
        findProduct(productId);
        return promotionRepository.findAllByProductIdOrderByStartsAtDesc(productId).stream()
                .map(this::toPromotionResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<PromotionCampaignResponse> getPromotionsBySeller(Long sellerId) {
        Map<String, List<Promotion>> campaigns = promotionRepository
                .findAllByProductSellerIdOrderByIdDesc(sellerId).stream()
                .collect(Collectors.groupingBy(
                        promotion -> promotion.getCampaignId() == null
                                ? "legacy-" + promotion.getId()
                                : promotion.getCampaignId(),
                        LinkedHashMap::new,
                        Collectors.toList()));
        return campaigns.values().stream().map(this::toCampaignResponse).toList();
    }

    @Transactional
    public PromotionCampaignResponse createPromotionCampaign(Long sellerId, PromotionCampaignRequest request) {
        validatePromotionPeriod(request.startsAt(), request.endsAt());
        List<Promotion> campaign = new ArrayList<>();
        String campaignId = UUID.randomUUID().toString();
        for (Long productId : new LinkedHashSet<>(request.productIds())) {
            Product product = findOwnedProduct(productId, sellerId);
            campaign.add(new Promotion(product, campaignId, request.name().trim(), request.discountPercent(),
                    request.startsAt(), request.endsAt()));
        }
        return toCampaignResponse(promotionRepository.saveAll(campaign));
    }

    @Transactional
    public void cancelPromotionCampaign(String campaignId, Long sellerId) {
        List<Promotion> campaign;
        if (campaignId.startsWith("legacy-")) {
            try {
                campaign = promotionRepository.findByIdAndProductSellerId(
                        Long.parseLong(campaignId.substring("legacy-".length())), sellerId)
                        .map(List::of).orElseGet(List::of);
            } catch (NumberFormatException error) {
                campaign = List.of();
            }
        } else {
            campaign = promotionRepository.findAllByCampaignIdAndProductSellerIdOrderByIdAsc(campaignId, sellerId);
        }
        if (campaign.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy khuyến mãi");
        }
        campaign.forEach(Promotion::cancel);
    }

    @Transactional
    public PromotionResponse createPromotion(Long productId, Long sellerId, PromotionRequest request) {
        validatePromotionPeriod(request.startsAt(), request.endsAt());
        Product product = findOwnedProduct(productId, sellerId);
        return toPromotionResponse(promotionRepository
                .save(new Promotion(product, request.discountPercent(), request.startsAt(), request.endsAt())));
    }

    @Transactional
    public void deletePromotion(Long promotionId, Long sellerId) {
        promotionRepository.findByIdAndProductSellerId(promotionId, sellerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy khuyến mãi"))
                .cancel();
    }

    private void validatePromotionPeriod(Instant startsAt, Instant endsAt) {
        if (!endsAt.isAfter(startsAt)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Thời gian kết thúc khuyến mãi phải sau thời gian bắt đầu");
        }
        if (endsAt.isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khuyến mãi đã hết hạn");
        }
    }

    private Product findProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm"));
    }

    private Product findOwnedProduct(Long productId, Long sellerId) {
        return productRepository.findByIdAndSellerId(productId, sellerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm"));
    }

    private Category findCategory(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy danh mục"));
    }

    private List<ProductResponse> toResponses(List<Product> products) {
        Map<Long, Integer> discounts = pricingService.activeDiscounts(products.stream().map(Product::getId).toList());
        return products.stream().map(product -> toResponse(product, discounts.getOrDefault(product.getId(), 0)))
                .toList();
    }

    private ProductResponse toResponse(Product product) {
        return toResponse(product, pricingService.activeDiscount(product.getId()));
    }

    private ProductResponse toResponse(Product product, int discountPercent) {
        return new ProductResponse(product.getId(), product.getSellerId(), product.getStoreId(),
                product.getCategory().getId(), product.getCategory().getName(),
                product.getName(), product.getDescription(), product.getPrice(), discountPercent,
                PricingService.effectivePrice(product.getPrice(), discountPercent),
                product.getStockQuantity(), product.getImageUrl(), product.getStatus(), product.isHiddenByStore());
    }

    private PromotionResponse toPromotionResponse(Promotion promotion) {
        return new PromotionResponse(promotion.getId(), promotion.getProduct().getId(),
                campaignId(promotion), campaignName(promotion), promotion.getDiscountPercent(),
                promotion.getStartsAt(), promotion.getEndsAt(), promotion.isCancelled());
    }

    private PromotionCampaignResponse toCampaignResponse(List<Promotion> promotions) {
        Promotion first = promotions.get(0);
        List<PromotionCampaignResponse.ProductItem> products = promotions.stream()
                .map(Promotion::getProduct)
                .collect(Collectors.toMap(Product::getId, product -> product, (left, right) -> left,
                        LinkedHashMap::new))
                .values().stream()
                .map(product -> new PromotionCampaignResponse.ProductItem(product.getId(), product.getName()))
                .toList();
        return new PromotionCampaignResponse(campaignId(first), campaignName(first), first.getDiscountPercent(),
                first.getStartsAt(), first.getEndsAt(), promotions.stream().allMatch(Promotion::isCancelled), products);
    }

    private String campaignId(Promotion promotion) {
        return promotion.getCampaignId() == null ? "legacy-" + promotion.getId() : promotion.getCampaignId();
    }

    private String campaignName(Promotion promotion) {
        return promotion.getCampaignName() == null || promotion.getCampaignName().isBlank()
                ? promotion.getProduct().getName()
                : promotion.getCampaignName();
    }
}
