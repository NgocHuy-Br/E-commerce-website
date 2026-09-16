package product_service.controller;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import product_service.dto.CategoryRequest;
import product_service.dto.PromotionRequest;
import product_service.dto.PromotionResponse;
import product_service.dto.ProductRequest;
import product_service.dto.ProductResponse;
import product_service.entity.Category;
import product_service.entity.Promotion;
import product_service.entity.Product;
import product_service.entity.ProductStatus;
import product_service.repository.CategoryRepository;
import product_service.repository.PromotionRepository;
import product_service.repository.ProductRepository;
import product_service.security.AuthPrincipal;
import product_service.service.StoreVerificationClient;

@RestController
@RequestMapping("/api/products")
public class ProductController {
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final PromotionRepository promotionRepository;
    private final StoreVerificationClient storeVerificationClient;
    private final String internalApiKey;

    public ProductController(ProductRepository productRepository, CategoryRepository categoryRepository,
            PromotionRepository promotionRepository, StoreVerificationClient storeVerificationClient,
            @Value("${app.internal.key}") String internalApiKey) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.promotionRepository = promotionRepository;
        this.storeVerificationClient = storeVerificationClient;
        this.internalApiKey = internalApiKey;
    }

    @GetMapping
    public List<ProductResponse> search(@RequestParam(defaultValue = "") String keyword) {
        return (keyword.isBlank() ? productRepository.findAllByStatusOrderByIdDesc(ProductStatus.ACTIVE)
                : productRepository.findByStatusAndNameContainingIgnoreCaseOrderByIdDesc(ProductStatus.ACTIVE, keyword))
                .stream().map(this::toResponse).toList();
    }

    @GetMapping("/{productId}")
    public ProductResponse getOne(@PathVariable Long productId) {
        Product product = findProduct(productId);
        if (product.getStatus() != ProductStatus.ACTIVE)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found");
        return toResponse(product);
    }

    @GetMapping("/categories")
    public List<Category> getCategories() {
        return categoryRepository.findAll();
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public Category createCategory(@Valid @RequestBody CategoryRequest request) {
        return categoryRepository.save(new Category(request.name(), request.description()));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('SELLER')")
    public ProductResponse create(@AuthenticationPrincipal AuthPrincipal principal,
            @org.springframework.web.bind.annotation.RequestHeader("Authorization") String authorization,
            @Valid @RequestBody ProductRequest request) {
        storeVerificationClient.verifyActiveOwner(request.storeId(), principal.userId(), authorization);
        Category category = findCategory(request.categoryId());
        return toResponse(
                productRepository.save(new Product(principal.userId(), request.storeId(), category, request.name(),
                        request.description(), request.price(), request.stockQuantity(), request.imageUrl())));
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('SELLER')")
    public List<ProductResponse> mine(@AuthenticationPrincipal AuthPrincipal principal) {
        return productRepository.findAllBySellerIdOrderByIdDesc(principal.userId()).stream().map(this::toResponse)
                .toList();
    }

    @PutMapping("/{productId}")
    @PreAuthorize("hasRole('SELLER')")
    public ProductResponse update(@PathVariable Long productId, @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody ProductRequest request) {
        Product product = productRepository.findByIdAndSellerId(productId, principal.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        product.update(findCategory(request.categoryId()), request.name(), request.description(), request.price(),
                request.stockQuantity(), request.imageUrl());
        return toResponse(product);
    }

    @PutMapping("/{productId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ProductResponse updateStatus(@PathVariable Long productId, @RequestParam ProductStatus status) {
        Product product = findProduct(productId);
        product.setStatus(status);
        return toResponse(product);
    }

    @PutMapping("/internal/{productId}/reserve")
    public ProductResponse reserveStock(@PathVariable Long productId, @RequestParam int quantity,
            @org.springframework.web.bind.annotation.RequestHeader("X-Internal-Key") String requestKey) {
        if (!internalApiKey.equals(requestKey)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid internal key");
        }
        if (quantity < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be positive");
        }
        Product product = findProduct(productId);
        try {
            product.decreaseStock(quantity);
        } catch (IllegalStateException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage());
        }
        return toResponse(product);
    }

    @GetMapping("/{productId}/promotions")
    public List<PromotionResponse> getPromotions(@PathVariable Long productId) {
        findProduct(productId);
        return promotionRepository.findAllByProductIdOrderByStartsAtDesc(productId).stream()
                .map(this::toPromotionResponse).toList();
    }

    @PostMapping("/{productId}/promotions")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('SELLER')")
    public PromotionResponse createPromotion(@PathVariable Long productId,
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody PromotionRequest request) {
        if (!request.endsAt().isAfter(request.startsAt())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Promotion end time must be after start time");
        }
        Product product = productRepository.findByIdAndSellerId(productId, principal.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        return toPromotionResponse(promotionRepository
                .save(new Promotion(product, request.discountPercent(), request.startsAt(), request.endsAt())));
    }

    private Product findProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    }

    private Category findCategory(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
    }

    private ProductResponse toResponse(Product product) {
        return new ProductResponse(product.getId(), product.getSellerId(), product.getStoreId(),
                product.getCategory().getId(), product.getCategory().getName(),
                product.getName(), product.getDescription(), product.getPrice(), product.getStockQuantity(),
                product.getImageUrl(), product.getStatus());
    }

    private PromotionResponse toPromotionResponse(Promotion promotion) {
        return new PromotionResponse(promotion.getId(), promotion.getProduct().getId(), promotion.getDiscountPercent(),
                promotion.getStartsAt(), promotion.getEndsAt());
    }
}
