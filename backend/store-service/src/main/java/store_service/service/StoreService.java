package store_service.service;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import store_service.dto.StoreRequest;
import store_service.dto.StoreStatsResponse;
import store_service.dto.StoreResponse;
import store_service.dto.StoreVerificationResponse;
import store_service.entity.Store;
import store_service.entity.StoreStatus;
import store_service.repository.StoreRepository;
import store_service.security.AuthPrincipal;

@Service
public class StoreService {

    private final StoreRepository storeRepository;
    private final AuthServiceClient authServiceClient;
    private final ProductCatalogClient productCatalogClient;

    public StoreService(StoreRepository storeRepository, AuthServiceClient authServiceClient,
            ProductCatalogClient productCatalogClient) {
        this.storeRepository = storeRepository;
        this.authServiceClient = authServiceClient;
        this.productCatalogClient = productCatalogClient;
    }

    @Transactional(readOnly = true)
    public List<StoreResponse> getActiveStores() {
        return storeRepository.findAllByStatusOrderByIdDesc(StoreStatus.ACTIVE).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public StoreResponse getActiveStore(Long storeId) {
        Store store = findStore(storeId);
        if (store.getStatus() != StoreStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy cửa hàng");
        }
        return toResponse(store);
    }

    @Transactional(readOnly = true)
    public StoreResponse getMine(AuthPrincipal principal) {
        return toResponse(storeRepository.findByOwnerId(principal.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy cửa hàng")));
    }

    @Transactional(readOnly = true)
    public StoreVerificationResponse verifySellerStore(Long storeId, AuthPrincipal principal) {
        Store store = findStore(storeId);
        if (!store.getOwnerId().equals(principal.userId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cửa hàng không thuộc về người bán này");
        }
        return new StoreVerificationResponse(store.getId(), store.getOwnerId(), store.getStatus());
    }

    @Transactional
    public StoreResponse create(AuthPrincipal principal, StoreRequest request) {
        if (storeRepository.findByOwnerId(principal.userId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Mỗi tài khoản chỉ mở được một cửa hàng");
        }
        Store store = storeRepository.save(new Store(principal.userId(), request.name(), request.description(),
                request.address(), request.phoneNumber(), request.logoUrl()));
        return toResponse(store);
    }

    @Transactional
    public StoreResponse updateMine(AuthPrincipal principal, StoreRequest request) {
        Store store = storeRepository.findByOwnerId(principal.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy cửa hàng"));
        store.update(request.name(), request.description(), request.address(), request.phoneNumber(),
                request.logoUrl());
        // Cửa hàng bị từ chối sau khi sửa lại thông tin thì được chờ duyệt lần nữa.
        if (store.getStatus() == StoreStatus.REJECTED) {
            store.setStatus(StoreStatus.PENDING);
        }
        return toResponse(store);
    }

    @Transactional(readOnly = true)
    public List<StoreResponse> getForAdmin(StoreStatus status) {
        List<Store> stores = status == null ? storeRepository.findAll()
                : storeRepository.findAllByStatusOrderByIdDesc(status);
        return stores.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public StoreStatsResponse getStatistics() {
        return new StoreStatsResponse(
                storeRepository.count(),
                storeRepository.countByStatus(StoreStatus.PENDING),
                storeRepository.countByStatus(StoreStatus.ACTIVE),
                storeRepository.countByStatus(StoreStatus.REJECTED),
                storeRepository.countByStatus(StoreStatus.SUSPENDED));
    }

    @Transactional
    public StoreResponse updateStatus(Long storeId, StoreStatus status, String authorization) {
        Store store = findStore(storeId);
        if (store.getStatus() == status) {
            return toResponse(store);
        }
        store.setStatus(status);
        if (status == StoreStatus.ACTIVE) {
            authServiceClient.grantSellerRole(store.getOwnerId(), authorization);
        }
        // Cửa hàng bị tạm ngưng hoặc từ chối thì sản phẩm phải biến khỏi sàn ngay,
        // được duyệt lại thì mở bán lại.
        productCatalogClient.setStoreProductsVisible(storeId, status == StoreStatus.ACTIVE);
        return toResponse(store);
    }

    private Store findStore(Long storeId) {
        return storeRepository.findById(storeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy cửa hàng"));
    }

    private StoreResponse toResponse(Store store) {
        return new StoreResponse(store.getId(), store.getOwnerId(), store.getName(), store.getDescription(),
                store.getAddress(), store.getPhoneNumber(), store.getLogoUrl(), store.getStatus());
    }
}
