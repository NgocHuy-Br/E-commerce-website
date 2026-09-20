package order_service.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StoreClient {
    private final RestClient client;

    public StoreClient(RestClient.Builder builder, @Value("${app.store-service.url}") String storeServiceUrl) {
        this.client = builder.baseUrl(storeServiceUrl).build();
    }

    /** Lấy cửa hàng của người bán đang đăng nhập để biết đơn nào thuộc shop của họ. */
    public StoreSnapshot myStore(String authorization) {
        StoreSnapshot store = client.get().uri("/api/stores/mine").header("Authorization", authorization).retrieve()
                .onStatus(HttpStatusCode::isError, (request, response) -> {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Người bán chưa có cửa hàng được duyệt");
                })
                .body(StoreSnapshot.class);
        if (store == null || store.id() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Người bán chưa có cửa hàng được duyệt");
        }
        return store;
    }

    public record StoreSnapshot(Long id, Long ownerId, String name, String status) {
    }
}
