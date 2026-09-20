package user_service.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
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

/** Kiểm tra nghiệp vụ thông tin cá nhân và sổ địa chỉ. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UserProfileServiceTest {

    private static final AuthPrincipal BUYER = new AuthPrincipal(7L, "nguoimua@nhom14.vn", Set.of("BUYER"));

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private AddressRepository addressRepository;

    @InjectMocks
    private UserProfileService userProfileService;

    private UserProfile existingProfile() {
        UserProfile profile = new UserProfile(7L, "nguoimua@nhom14.vn");
        when(userProfileRepository.findByUserId(7L)).thenReturn(Optional.of(profile));
        return profile;
    }

    private AddressRequest addressRequest(boolean defaultAddress) {
        return new AddressRequest("Nguyễn Văn Mua", "0987654321", "Số 5 ngõ 12", "Phường Thượng Đình",
                "Quận Thanh Xuân", "Hà Nội", defaultAddress);
    }

    @Test
    @DisplayName("Cập nhật thông tin cá nhân thì lưu đúng họ tên và số điện thoại")
    void updateProfileSavesNewInformation() {
        existingProfile();

        ProfileResponse response = userProfileService.updateProfile(BUYER,
                new ProfileUpdateRequest("Nguyễn Văn Mua", "0987654321", null));

        assertThat(response.fullName()).isEqualTo("Nguyễn Văn Mua");
        assertThat(response.phoneNumber()).isEqualTo("0987654321");
    }

    @Test
    @DisplayName("Thêm địa chỉ mới đặt làm mặc định thì bỏ mặc định của địa chỉ cũ")
    void newDefaultAddressClearsOldDefault() {
        UserProfile profile = existingProfile();
        Address oldDefault = new Address(profile, "Người cũ", "0900000000", "Số 1", "Phường 1", "Quận 1",
                "Hà Nội", true);
        when(addressRepository.findAllByProfileIdOrderByDefaultAddressDescIdDesc(profile.getId()))
                .thenReturn(List.of(oldDefault));
        when(addressRepository.save(any(Address.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AddressResponse response = userProfileService.createAddress(BUYER, addressRequest(true));

        assertThat(response.defaultAddress()).isTrue();
        assertThat(oldDefault.isDefaultAddress()).isFalse();
    }

    @Test
    @DisplayName("Thêm địa chỉ không đặt mặc định thì không đụng tới địa chỉ khác")
    void nonDefaultAddressKeepsOldDefault() {
        existingProfile();
        when(addressRepository.save(any(Address.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AddressResponse response = userProfileService.createAddress(BUYER, addressRequest(false));

        assertThat(response.defaultAddress()).isFalse();
        verify(addressRepository, org.mockito.Mockito.never())
                .findAllByProfileIdOrderByDefaultAddressDescIdDesc(any());
    }

    @Test
    @DisplayName("Sửa địa chỉ không thuộc về mình thì báo không tìm thấy")
    void updateAddressOfAnotherUserIsRejected() {
        when(addressRepository.findByIdAndProfileUserId(99L, 7L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userProfileService.updateAddress(99L, BUYER, addressRequest(false)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Không tìm thấy địa chỉ");
    }

    @Test
    @DisplayName("Xoá địa chỉ không thuộc về mình thì báo không tìm thấy")
    void deleteAddressOfAnotherUserIsRejected() {
        when(addressRepository.findByIdAndProfileUserId(99L, 7L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userProfileService.deleteAddress(99L, BUYER))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Không tìm thấy địa chỉ");
    }

    @Test
    @DisplayName("Xoá địa chỉ của mình thì gọi repository xoá đúng địa chỉ đó")
    void deleteOwnAddress() {
        UserProfile profile = new UserProfile(7L, "nguoimua@nhom14.vn");
        Address address = new Address(profile, "Người nhận", "0900000000", "Số 1", "Phường 1", "Quận 1",
                "Hà Nội", false);
        when(addressRepository.findByIdAndProfileUserId(5L, 7L)).thenReturn(Optional.of(address));

        userProfileService.deleteAddress(5L, BUYER);

        verify(addressRepository).delete(address);
    }
}
