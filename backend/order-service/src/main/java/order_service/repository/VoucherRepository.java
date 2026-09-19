package order_service.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import order_service.entity.Voucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VoucherRepository extends JpaRepository<Voucher, Long> {

    Optional<Voucher> findByCodeIgnoreCase(String code);

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
