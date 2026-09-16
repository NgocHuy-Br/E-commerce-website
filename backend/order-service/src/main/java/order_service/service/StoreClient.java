package order_service.service;

import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StoreClient {
    private final RestClient client;

    public StoreClient(RestClient.Builder builder) {
        this.client = builder.baseUrl("http://localhost:8084").build();
    }

    public void verifyOwner(Long storeId, String authorization) {
        client.get().uri("/api/stores/{id}/verification", storeId).header("Authorization", authorization).retrieve()
                .onStatus(HttpStatusCode::isError, (request, response) -> {
                    throw new ResponseStatusException(response.getStatusCode(), "Seller does not own this order");
                })
                .toBodilessEntity();
    }
}