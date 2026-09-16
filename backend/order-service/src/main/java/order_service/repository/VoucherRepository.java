package order_service.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import order_service.entity.Voucher;

public interface VoucherRepository extends JpaRepository<Voucher, Long> {
    Optional<Voucher> findByCodeIgnoreCase(String code);
}