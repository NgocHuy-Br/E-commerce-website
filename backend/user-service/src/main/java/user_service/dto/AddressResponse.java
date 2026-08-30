package user_service.dto;

public record AddressResponse(
        Long id,
        String recipientName,
        String phoneNumber,
        String detail,
        String ward,
        String district,
        String city,
        boolean defaultAddress) {
}
