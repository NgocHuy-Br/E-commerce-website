package user_service.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "addresses")
public class Address {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profile_id", nullable = false)
    private UserProfile profile;

    @Column(nullable = false, length = 100)
    private String recipientName;

    @Column(nullable = false, length = 20)
    private String phoneNumber;

    @Column(nullable = false, length = 255)
    private String detail;

    @Column(nullable = false, length = 100)
    private String ward;

    @Column(nullable = false, length = 100)
    private String district;

    @Column(nullable = false, length = 100)
    private String city;

    @Column(nullable = false)
    private boolean defaultAddress;

    protected Address() {
    }

    public Address(UserProfile profile, String recipientName, String phoneNumber, String detail, String ward,
            String district, String city, boolean defaultAddress) {
        this.profile = profile;
        this.recipientName = recipientName;
        this.phoneNumber = phoneNumber;
        this.detail = detail;
        this.ward = ward;
        this.district = district;
        this.city = city;
        this.defaultAddress = defaultAddress;
    }

    public Long getId() {
        return id;
    }

    public UserProfile getProfile() {
        return profile;
    }

    public String getRecipientName() {
        return recipientName;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public String getDetail() {
        return detail;
    }

    public String getWard() {
        return ward;
    }

    public String getDistrict() {
        return district;
    }

    public String getCity() {
        return city;
    }

    public boolean isDefaultAddress() {
        return defaultAddress;
    }

    public void update(String recipientName, String phoneNumber, String detail, String ward, String district,
            String city, boolean defaultAddress) {
        this.recipientName = recipientName;
        this.phoneNumber = phoneNumber;
        this.detail = detail;
        this.ward = ward;
        this.district = district;
        this.city = city;
        this.defaultAddress = defaultAddress;
    }

    public void setDefaultAddress(boolean defaultAddress) {
        this.defaultAddress = defaultAddress;
    }
}
