package order_service.service;

import java.math.BigDecimal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProductClient {
    private final RestClient client;
    private final String internalApiKey;

    public ProductClient(RestClient.Builder builder, @Value("${app.internal.key}") String internalApiKey) {
        this.client = builder.baseUrl("http://localhost:8083").build();
        this.internalApiKey = internalApiKey;
    }

    public ProductSnapshot reserve(Long productId, int quantity) {
        ProductSnapshot product = client.put()
                .uri("/api/products/internal/{id}/reserve?quantity={quantity}", productId, quantity)
                .header("X-Internal-Key", internalApiKey).retrieve()
                .onStatus(HttpStatusCode::isError, (request, response) -> {
                    throw new ResponseStatusException(response.getStatusCode(), "Product is unavailable");
                })
                .body(ProductSnapshot.class);
        if (product == null)
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Product is unavailable");
        return product;
    }

    public record ProductSnapshot(Long id, Long storeId, String name, BigDecimal price) {
    }
}