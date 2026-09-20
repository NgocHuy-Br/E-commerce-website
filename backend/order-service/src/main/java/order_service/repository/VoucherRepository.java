package order_service.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import order_service.entity.Voucher;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VoucherRepository extends JpaRepository<Voucher, Long> {

    Optional<Voucher> findByCodeIgnoreCase(String code);

    /** Khoá dòng khi trừ lượt dùng để hai đơn cùng lúc không vượt số lượt còn lại. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select voucher from Voucher voucher where upper(voucher.code) = upper(:code)")
    Optional<Voucher> findByCodeForUpdate(@Param("code") String code);

    boolean existsByCodeIgnoreCase(String code);

    List<Voucher> findAllByOrderByIdDesc();

    /** Voucher còn hiệu lực để người mua chọn khi thanh toán. */
    @Query("""
            select voucher from Voucher voucher
            where voucher.remainingUses > 0 and voucher.startsAt <= :now and voucher.endsAt > :now
            order by voucher.discountPercent desc
            """)
    List<Voucher> findActive(@Param("now") Instant now);
}
