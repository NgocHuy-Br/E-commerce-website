package product_service.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StoreVerificationClient {

    private final RestClient restClient;

    public StoreVerificationClient(RestClient.Builder builder,
            @Value("${app.store-service.url}") String storeServiceUrl) {
        this.restClient = builder.baseUrl(storeServiceUrl).build();
    }

    public void verifyActiveOwner(Long storeId, Long sellerId, String authorization) {
        StoreVerificationResponse store = restClient.get()
                .uri("/api/stores/{storeId}/verification", storeId)
                .header("Authorization", authorization)
                .retrieve()
                .onStatus(HttpStatusCode::isError,
                        (request, response) -> {
                            throw new ResponseStatusException(response.getStatusCode(), "Store verification failed");
                        })
                .body(StoreVerificationResponse.class);
        if (store == null || !store.ownerId().equals(sellerId) || !"ACTIVE".equals(store.status())) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN,
                    "An active seller store is required");
        }
    }

    private record StoreVerificationResponse(Long id, Long ownerId, String status) {
    }
}