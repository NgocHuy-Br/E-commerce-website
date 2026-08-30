package user_service.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import user_service.entity.Address;

public interface AddressRepository extends JpaRepository<Address, Long> {
    List<Address> findAllByProfileIdOrderByDefaultAddressDescIdDesc(Long profileId);

    Optional<Address> findByIdAndProfileUserId(Long id, Long userId);
}
