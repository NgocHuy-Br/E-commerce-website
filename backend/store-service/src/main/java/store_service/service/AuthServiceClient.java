package store_service.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthServiceClient {
    private final RestClient client;

    public AuthServiceClient(RestClient.Builder builder,
            @Value("${app.auth-service.url}") String authServiceUrl) {
        this.client = builder.baseUrl(authServiceUrl).build();
    }

    public void grantSellerRole(Long accountId, String authorization) {
        client.patch().uri("/api/auth/admin/accounts/{id}/seller-role", accountId)
                .header("Authorization", authorization).retrieve()
                .onStatus(HttpStatusCode::isError, (request, response) -> {
                    throw new ResponseStatusException(response.getStatusCode(), "Could not grant seller role");
                })
                .toBodilessEntity();
    }
}