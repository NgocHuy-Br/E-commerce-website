package store_service.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import store_service.entity.Store;
import store_service.entity.StoreStatus;

public interface StoreRepository extends JpaRepository<Store, Long> {
    Optional<Store> findByOwnerId(Long ownerId);

    List<Store> findAllByStatusOrderByIdDesc(StoreStatus status);
}
