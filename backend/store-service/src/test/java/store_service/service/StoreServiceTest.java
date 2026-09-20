package store_service.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;
import store_service.dto.StoreRequest;
import store_service.dto.StoreResponse;
import store_service.entity.Store;
import store_service.entity.StoreStatus;
import store_service.repository.StoreRepository;
import store_service.security.AuthPrincipal;

/** Kiểm tra nghiệp vụ mở cửa hàng và quy trình duyệt cửa hàng. */
@ExtendWith(MockitoExtension.class)
class StoreServiceTest {

    private static final AuthPrincipal SELLER = new AuthPrincipal(5L, "nguoiban@nhom14.vn",
            Set.of("BUYER", "SELLER"));
    private static final String TOKEN = "Bearer token-cua-quan-tri";

    @Mock
    private StoreRepository storeRepository;

    @Mock
    private AuthServiceClient authServiceClient;

    @Mock
    private ProductCatalogClient productCatalogClient;

    @InjectMocks
    private StoreService storeService;

    private Store store(StoreStatus status) {
        Store store = new Store(5L, "Shop Công Nghệ", "Mô tả", "Hà Nội", "0901234567", null);
        store.setStatus(status);
        return store;
    }

    private StoreRequest request() {
        return new StoreRequest("Shop Công Nghệ", "Mô tả mới", "12 Trần Phú, Hà Đông", "0901234567", null);
    }

    @Test
    @DisplayName("Mỗi tài khoản chỉ mở được một cửa hàng")
    void cannotOpenSecondStore() {
        when(storeRepository.findByOwnerId(5L)).thenReturn(Optional.of(store(StoreStatus.ACTIVE)));

        assertThatThrownBy(() -> storeService.create(SELLER, request()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("chỉ mở được một cửa hàng");
    }

    @Test
    @DisplayName("Cửa hàng chưa được duyệt thì khách không xem được")
    void pendingStoreIsHiddenFromBuyers() {
        when(storeRepository.findById(1L)).thenReturn(Optional.of(store(StoreStatus.PENDING)));

        assertThatThrownBy(() -> storeService.getActiveStore(1L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Không tìm thấy cửa hàng");
    }

    @Test
    @DisplayName("Người bán không xác minh được cửa hàng của người khác")
    void cannotVerifyStoreOfAnotherSeller() {
        Store otherStore = new Store(99L, "Shop khác", null, "Hà Nội", "0901234567", null);
        when(storeRepository.findById(2L)).thenReturn(Optional.of(otherStore));

        assertThatThrownBy(() -> storeService.verifySellerStore(2L, SELLER))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("không thuộc về người bán");
    }

    @Test
    @DisplayName("Duyệt cửa hàng thì cấp quyền người bán và mở bán lại sản phẩm")
    void approvingStoreGrantsSellerRoleAndShowsProducts() {
        when(storeRepository.findById(1L)).thenReturn(Optional.of(store(StoreStatus.PENDING)));

        StoreResponse response = storeService.updateStatus(1L, StoreStatus.ACTIVE, TOKEN);

        assertThat(response.status()).isEqualTo(StoreStatus.ACTIVE);
        verify(authServiceClient).grantSellerRole(5L, TOKEN);
        verify(productCatalogClient).setStoreProductsVisible(1L, true);
    }

    @Test
    @DisplayName("Tạm ngưng cửa hàng thì ẩn toàn bộ sản phẩm của cửa hàng đó")
    void suspendingStoreHidesItsProducts() {
        when(storeRepository.findById(1L)).thenReturn(Optional.of(store(StoreStatus.ACTIVE)));

        storeService.updateStatus(1L, StoreStatus.SUSPENDED, TOKEN);

        verify(productCatalogClient).setStoreProductsVisible(1L, false);
        verify(authServiceClient, org.mockito.Mockito.never()).grantSellerRole(5L, TOKEN);
    }

    @Test
    @DisplayName("Cửa hàng bị từ chối sửa lại thông tin thì được chờ duyệt lần nữa")
    void rejectedStoreGoesBackToPendingAfterUpdate() {
        when(storeRepository.findByOwnerId(5L)).thenReturn(Optional.of(store(StoreStatus.REJECTED)));

        StoreResponse response = storeService.updateMine(SELLER, request());

        assertThat(response.status()).isEqualTo(StoreStatus.PENDING);
    }

    @Test
    @DisplayName("Cửa hàng đang hoạt động sửa thông tin thì vẫn giữ trạng thái hoạt động")
    void activeStoreKeepsStatusAfterUpdate() {
        when(storeRepository.findByOwnerId(5L)).thenReturn(Optional.of(store(StoreStatus.ACTIVE)));

        StoreResponse response = storeService.updateMine(SELLER, request());

        assertThat(response.status()).isEqualTo(StoreStatus.ACTIVE);
        assertThat(response.description()).isEqualTo("Mô tả mới");
    }
}
