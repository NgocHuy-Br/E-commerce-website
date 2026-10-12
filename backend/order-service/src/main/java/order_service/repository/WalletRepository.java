package order_service.repository;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import order_service.entity.Wallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WalletRepository extends JpaRepository<Wallet, Long> {

    /** Khoá dòng ví khi đổi số dư để hai giao dịch cùng lúc không ghi đè nhau. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select wallet from Wallet wallet where wallet.userId = :userId")
    Optional<Wallet> findByUserIdForUpdate(@Param("userId") Long userId);

    Optional<Wallet> findByUserId(Long userId);
}
