package order_service.service;

import java.math.BigDecimal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProductClient {
    private final RestClient client;
    private final String internalApiKey;

    public ProductClient(RestClient.Builder builder,
            @Value("${app.product-service.url}") String productServiceUrl,
            @Value("${app.internal.key}") String internalApiKey) {
        this.client = builder.baseUrl(productServiceUrl).build();
        this.internalApiKey = internalApiKey;
    }

    /** Lấy thông tin sản phẩm công khai (tên, giá sau khuyến mãi, tồn kho). */
    public ProductSnapshot fetch(Long productId) {
        return require(client.get().uri("/api/products/{id}", productId).retrieve()
                .onStatus(HttpStatusCode::isError, (request, response) -> {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sản phẩm không khả dụng");
                })
                .body(ProductSnapshot.class));
    }

    /** Trừ kho khi đặt hàng, trả về giá chốt đơn theo khuyến mãi đang chạy. */
    public ProductSnapshot reserve(Long productId, int quantity) {
        return require(client.put()
                .uri("/api/products/internal/{id}/reserve?quantity={quantity}", productId, quantity)
                .header("X-Internal-Key", internalApiKey).retrieve()
                .onStatus(HttpStatusCode::isError, (request, response) -> {
                    throw new ResponseStatusException(response.getStatusCode(), "Sản phẩm không còn đủ hàng");
                })
                .body(ProductSnapshot.class));
    }

    /** Hoàn kho khi huỷ đơn. */
    public void release(Long productId, int quantity) {
        client.put().uri("/api/products/internal/{id}/release?quantity={quantity}", productId, quantity)
                .header("X-Internal-Key", internalApiKey).retrieve()
                .onStatus(HttpStatusCode::isError, (request, response) -> {
                    throw new ResponseStatusException(response.getStatusCode(), "Không thể hoàn kho sản phẩm");
                })
                .toBodilessEntity();
    }

    private ProductSnapshot require(ProductSnapshot product) {
        if (product == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sản phẩm không khả dụng");
        }
        return product;
    }

    public record ProductSnapshot(Long id, Long storeId, String name, BigDecimal price, int discountPercent,
            BigDecimal effectivePrice, int stockQuantity, String imageUrl, String status, boolean hiddenByStore) {

        public BigDecimal sellingPrice() {
            return effectivePrice == null ? price : effectivePrice;
        }
    }
}
