package store_service.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

/** Gọi product-service để ẩn hoặc mở lại sản phẩm theo trạng thái cửa hàng. */
@Service
public class ProductCatalogClient {

    private static final Logger log = LoggerFactory.getLogger(ProductCatalogClient.class);

    private final RestClient client;
    private final String internalApiKey;

    public ProductCatalogClient(RestClient.Builder builder,
            @Value("${app.product-service.url}") String productServiceUrl,
            @Value("${app.internal.key}") String internalApiKey) {
        this.client = builder.baseUrl(productServiceUrl).build();
        this.internalApiKey = internalApiKey;
    }

    public void setStoreProductsVisible(Long storeId, boolean visible) {
        client.put()
                .uri("/api/products/internal/store/{storeId}/visibility?visible={visible}", storeId, visible)
                .header("X-Internal-Key", internalApiKey)
                .retrieve()
                .onStatus(HttpStatusCode::isError, (request, response) -> {
                    throw new ResponseStatusException(response.getStatusCode(),
                            "Không cập nhật được trạng thái sản phẩm của cửa hàng");
                })
                .toBodilessEntity();
        log.info("Đã {} sản phẩm của cửa hàng {}", visible ? "mở bán lại" : "ẩn", storeId);
    }
}
