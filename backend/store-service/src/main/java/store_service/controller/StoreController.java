package store_service.controller;

import jakarta.validation.Valid;
import java.util.List;
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
import store_service.dto.StoreRequest;
import store_service.dto.StoreStatsResponse;
import store_service.dto.StoreResponse;
import store_service.dto.StoreStatusRequest;
import store_service.dto.StoreVerificationResponse;
import store_service.entity.StoreStatus;
import store_service.security.AuthPrincipal;
import store_service.service.StoreService;

@RestController
@RequestMapping("/api/stores")
public class StoreController {

    private final StoreService storeService;

    public StoreController(StoreService storeService) {
        this.storeService = storeService;
    }

    @GetMapping
    public List<StoreResponse> getActiveStores() {
        return storeService.getActiveStores();
    }

    @GetMapping("/{storeId}")
    public StoreResponse getActiveStore(@PathVariable Long storeId) {
        return storeService.getActiveStore(storeId);
    }

    @GetMapping("/mine")
    @PreAuthorize("hasAnyRole('BUYER','SELLER')")
    public StoreResponse getMine(@AuthenticationPrincipal AuthPrincipal principal) {
        return storeService.getMine(principal);
    }

    @GetMapping("/{storeId}/verification")
    @PreAuthorize("hasRole('SELLER')")
    public StoreVerificationResponse verifySellerStore(@PathVariable Long storeId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return storeService.verifySellerStore(storeId, principal);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('BUYER')")
    public StoreResponse create(@AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody StoreRequest request) {
        return storeService.create(principal, request);
    }

    @PutMapping("/mine")
    @PreAuthorize("hasAnyRole('BUYER','SELLER')")
    public StoreResponse updateMine(@AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody StoreRequest request) {
        return storeService.updateMine(principal, request);
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public List<StoreResponse> getForAdmin(@RequestParam(required = false) StoreStatus status) {
        return storeService.getForAdmin(status);
    }

    @GetMapping("/admin/statistics")
    @PreAuthorize("hasRole('ADMIN')")
    public StoreStatsResponse getStatistics() {
        return storeService.getStatistics();
    }

    @PutMapping("/{storeId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public StoreResponse updateStatus(@PathVariable Long storeId, @Valid @RequestBody StoreStatusRequest request,
            @org.springframework.web.bind.annotation.RequestHeader("Authorization") String authorization) {
        return storeService.updateStatus(storeId, request.status(), authorization);
    }
}
