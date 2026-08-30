package user_service.controller;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import user_service.dto.AddressRequest;
import user_service.dto.AddressResponse;
import user_service.dto.ProfileResponse;
import user_service.dto.ProfileUpdateRequest;
import user_service.security.AuthPrincipal;
import user_service.service.UserProfileService;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserProfileService userProfileService;

    public UserController(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    @GetMapping("/me")
    public ProfileResponse getProfile(@AuthenticationPrincipal AuthPrincipal principal) {
        return userProfileService.getProfile(principal);
    }

    @PutMapping("/me")
    public ProfileResponse updateProfile(@AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody ProfileUpdateRequest request) {
        return userProfileService.updateProfile(principal, request);
    }

    @GetMapping("/me/addresses")
    public List<AddressResponse> getAddresses(@AuthenticationPrincipal AuthPrincipal principal) {
        return userProfileService.getAddresses(principal);
    }

    @PostMapping("/me/addresses")
    @ResponseStatus(HttpStatus.CREATED)
    public AddressResponse createAddress(@AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody AddressRequest request) {
        return userProfileService.createAddress(principal, request);
    }

    @PutMapping("/me/addresses/{addressId}")
    public AddressResponse updateAddress(@PathVariable Long addressId, @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody AddressRequest request) {
        return userProfileService.updateAddress(addressId, principal, request);
    }

    @DeleteMapping("/me/addresses/{addressId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAddress(@PathVariable Long addressId, @AuthenticationPrincipal AuthPrincipal principal) {
        userProfileService.deleteAddress(addressId, principal);
    }
}
