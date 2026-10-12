package order_service.repository;

import java.math.BigDecimal;
import java.util.List;
import order_service.entity.WalletTransaction;
import order_service.entity.WalletTransactionStatus;
import order_service.entity.WalletTransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {

    List<WalletTransaction> findTop100ByUserIdOrderByIdDesc(Long userId);

    List<WalletTransaction> findAllByTypeOrderByIdDesc(WalletTransactionType type);

    List<WalletTransaction> findAllByTypeAndStatusOrderByIdDesc(WalletTransactionType type,
            WalletTransactionStatus status);

    @Query("select coalesce(sum(tx.amount), 0) from WalletTransaction tx "
            + "where tx.userId = :userId and tx.type = :type and tx.status = :status")
    BigDecimal sumAmount(@Param("userId") Long userId, @Param("type") WalletTransactionType type,
            @Param("status") WalletTransactionStatus status);
}
