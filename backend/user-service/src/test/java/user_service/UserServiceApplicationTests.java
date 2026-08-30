package user_service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import user_service.dto.ProfileResponse;
import user_service.entity.UserProfile;
import user_service.repository.AddressRepository;
import user_service.repository.UserProfileRepository;
import user_service.security.AuthPrincipal;
import user_service.service.UserProfileService;

@ExtendWith(MockitoExtension.class)
class UserServiceApplicationTests {

	@Mock
	private UserProfileRepository userProfileRepository;

	@Mock
	private AddressRepository addressRepository;

	@InjectMocks
	private UserProfileService userProfileService;

	@Test
	void getProfileCreatesProfileForFirstAuthenticatedRequest() {
		AuthPrincipal principal = new AuthPrincipal(7L, "buyer@example.com", "BUYER");
		when(userProfileRepository.findByUserId(7L)).thenReturn(Optional.empty());
		when(userProfileRepository.save(any(UserProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

		ProfileResponse response = userProfileService.getProfile(principal);

		assertEquals(7L, response.userId());
		assertEquals("buyer@example.com", response.email());
		verify(userProfileRepository).save(any(UserProfile.class));
	}
}
