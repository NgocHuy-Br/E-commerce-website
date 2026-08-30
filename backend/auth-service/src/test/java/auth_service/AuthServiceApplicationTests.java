package auth_service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import auth_service.dto.AuthResponse;
import auth_service.dto.LoginRequest;
import auth_service.dto.RegisterRequest;
import auth_service.entity.Account;
import auth_service.entity.Role;
import auth_service.repository.AccountRepository;
import auth_service.security.JwtService;
import auth_service.service.AuthService;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class AuthServiceApplicationTests {

	@Mock
	private AccountRepository accountRepository;

	@Mock
	private PasswordEncoder passwordEncoder;

	@Mock
	private JwtService jwtService;

	@InjectMocks
	private AuthService authService;

	@Test
	void registerCreatesBuyerAccountAndReturnsToken() {
		when(accountRepository.existsByEmail("buyer@example.com")).thenReturn(false);
		when(passwordEncoder.encode("password123")).thenReturn("hashed-password");
		when(accountRepository.save(any(Account.class))).thenAnswer(invocation -> invocation.getArgument(0));
		when(jwtService.generateToken(any(Account.class))).thenReturn("access-token");

		AuthResponse response = authService.register(new RegisterRequest("BUYER@example.com", "password123"));

		assertEquals("access-token", response.accessToken());
		assertEquals("buyer@example.com", response.email());
		assertTrue(response.roles().contains(Role.BUYER));
		verify(accountRepository).save(any(Account.class));
	}

	@Test
	void loginRejectsIncorrectPassword() {
		Account account = new Account("buyer@example.com", "hashed-password");
		when(accountRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(account));
		when(passwordEncoder.matches("wrong-password", "hashed-password")).thenReturn(false);

		assertThrows(
				ResponseStatusException.class,
				() -> authService.login(new LoginRequest("buyer@example.com", "wrong-password")));
	}
}
