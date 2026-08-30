package user_service.service;

import jakarta.transaction.Transactional;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import user_service.dto.AddressRequest;
import user_service.dto.AddressResponse;
import user_service.dto.ProfileResponse;
import user_service.dto.ProfileUpdateRequest;
import user_service.entity.Address;
import user_service.entity.UserProfile;
import user_service.repository.AddressRepository;
import user_service.repository.UserProfileRepository;
import user_service.security.AuthPrincipal;

@Service
public class UserProfileService {

    private final UserProfileRepository userProfileRepository;
    private final AddressRepository addressRepository;

    public UserProfileService(UserProfileRepository userProfileRepository, AddressRepository addressRepository) {
        this.userProfileRepository = userProfileRepository;
        this.addressRepository = addressRepository;
    }

    @Transactional
    public ProfileResponse getProfile(AuthPrincipal principal) {
        return toProfileResponse(getOrCreateProfile(principal));
    }

    @Transactional
    public ProfileResponse updateProfile(AuthPrincipal principal, ProfileUpdateRequest request) {
        UserProfile profile = getOrCreateProfile(principal);
        profile.update(request.fullName(), request.phoneNumber(), request.avatarUrl());
        return toProfileResponse(profile);
    }

    @Transactional
    public List<AddressResponse> getAddresses(AuthPrincipal principal) {
        UserProfile profile = getOrCreateProfile(principal);
        return addressRepository.findAllByProfileIdOrderByDefaultAddressDescIdDesc(profile.getId()).stream()
                .map(this::toAddressResponse)
                .toList();
    }

    @Transactional
    public AddressResponse createAddress(AuthPrincipal principal, AddressRequest request) {
        UserProfile profile = getOrCreateProfile(principal);
        if (request.defaultAddress()) {
            clearDefaultAddress(profile);
        }
        Address address = addressRepository.save(new Address(profile, request.recipientName(), request.phoneNumber(),
                request.detail(), request.ward(), request.district(), request.city(), request.defaultAddress()));
        return toAddressResponse(address);
    }

    @Transactional
    public AddressResponse updateAddress(Long addressId, AuthPrincipal principal, AddressRequest request) {
        Address address = findOwnedAddress(addressId, principal.userId());
        if (request.defaultAddress()) {
            clearDefaultAddress(address.getProfile());
        }
        address.update(request.recipientName(), request.phoneNumber(), request.detail(), request.ward(),
                request.district(),
                request.city(), request.defaultAddress());
        return toAddressResponse(address);
    }

    @Transactional
    public void deleteAddress(Long addressId, AuthPrincipal principal) {
        addressRepository.delete(findOwnedAddress(addressId, principal.userId()));
    }

    private UserProfile getOrCreateProfile(AuthPrincipal principal) {
        return userProfileRepository.findByUserId(principal.userId())
                .orElseGet(() -> userProfileRepository.save(new UserProfile(principal.userId(), principal.email())));
    }

    private void clearDefaultAddress(UserProfile profile) {
        addressRepository.findAllByProfileIdOrderByDefaultAddressDescIdDesc(profile.getId())
                .forEach(address -> address.setDefaultAddress(false));
    }

    private Address findOwnedAddress(Long addressId, Long userId) {
        return addressRepository.findByIdAndProfileUserId(addressId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Address not found"));
    }

    private ProfileResponse toProfileResponse(UserProfile profile) {
        return new ProfileResponse(profile.getUserId(), profile.getEmail(), profile.getFullName(),
                profile.getPhoneNumber(), profile.getAvatarUrl());
    }

    private AddressResponse toAddressResponse(Address address) {
        return new AddressResponse(address.getId(), address.getRecipientName(), address.getPhoneNumber(),
                address.getDetail(),
                address.getWard(), address.getDistrict(), address.getCity(), address.isDefaultAddress());
    }
}
