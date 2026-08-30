package store_service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import store_service.dto.StoreRequest;
import store_service.dto.StoreResponse;
import store_service.entity.Store;
import store_service.entity.StoreStatus;
import store_service.repository.StoreRepository;
import store_service.security.AuthPrincipal;
import store_service.service.StoreService;

@ExtendWith(MockitoExtension.class)
class StoreServiceApplicationTests {

	@Mock
	private StoreRepository storeRepository;

	@InjectMocks
	private StoreService storeService;

	@Test
	void createCreatesPendingStoreForSeller() {
		when(storeRepository.findByOwnerId(5L)).thenReturn(Optional.empty());
		when(storeRepository.save(any(Store.class))).thenAnswer(invocation -> invocation.getArgument(0));

		StoreResponse response = storeService.create(
				new AuthPrincipal(5L, "seller@example.com", Set.of("SELLER", "BUYER")),
				new StoreRequest("Tech Shop", "Electronics", "Ha Noi", "0900000000", null));

		assertEquals("Tech Shop", response.name());
		assertEquals(StoreStatus.PENDING, response.status());
		verify(storeRepository).save(any(Store.class));
	}
}
