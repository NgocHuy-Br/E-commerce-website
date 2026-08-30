package store_service.service;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import store_service.dto.StoreRequest;
import store_service.dto.StoreResponse;
import store_service.entity.Store;
import store_service.entity.StoreStatus;
import store_service.repository.StoreRepository;
import store_service.security.AuthPrincipal;

@Service
public class StoreService {

    private final StoreRepository storeRepository;

    public StoreService(StoreRepository storeRepository) {
        this.storeRepository = storeRepository;
    }

    @Transactional(readOnly = true)
    public List<StoreResponse> getActiveStores() {
        return storeRepository.findAllByStatusOrderByIdDesc(StoreStatus.ACTIVE).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public StoreResponse getActiveStore(Long storeId) {
        Store store = findStore(storeId);
        if (store.getStatus() != StoreStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Store not found");
        }
        return toResponse(store);
    }

    @Transactional(readOnly = true)
    public StoreResponse getMine(AuthPrincipal principal) {
        return toResponse(storeRepository.findByOwnerId(principal.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Store not found")));
    }

    @Transactional
    public StoreResponse create(AuthPrincipal principal, StoreRequest request) {
        if (storeRepository.findByOwnerId(principal.userId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Seller already owns a store");
        }
        Store store = storeRepository.save(new Store(principal.userId(), request.name(), request.description(),
                request.address(), request.phoneNumber(), request.logoUrl()));
        return toResponse(store);
    }

    @Transactional
    public StoreResponse updateMine(AuthPrincipal principal, StoreRequest request) {
        Store store = storeRepository.findByOwnerId(principal.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Store not found"));
        store.update(request.name(), request.description(), request.address(), request.phoneNumber(),
                request.logoUrl());
        return toResponse(store);
    }

    @Transactional(readOnly = true)
    public List<StoreResponse> getForAdmin(StoreStatus status) {
        List<Store> stores = status == null ? storeRepository.findAll()
                : storeRepository.findAllByStatusOrderByIdDesc(status);
        return stores.stream().map(this::toResponse).toList();
    }

    @Transactional
    public StoreResponse updateStatus(Long storeId, StoreStatus status) {
        Store store = findStore(storeId);
        store.setStatus(status);
        return toResponse(store);
    }

    private Store findStore(Long storeId) {
        return storeRepository.findById(storeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Store not found"));
    }

    private StoreResponse toResponse(Store store) {
        return new StoreResponse(store.getId(), store.getOwnerId(), store.getName(), store.getDescription(),
                store.getAddress(), store.getPhoneNumber(), store.getLogoUrl(), store.getStatus());
    }
}
