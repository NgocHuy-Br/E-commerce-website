package order_service.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

/** Cấu hình toàn sàn do admin đặt; chỉ có một dòng (id = 1). */
@Entity
@Table(name = "platform_settings")
public class PlatformSetting {
    public static final long SINGLETON_ID = 1L;
    public static final BigDecimal DEFAULT_COMMISSION_PERCENT = new BigDecimal("5.00");

    @Id
    private Long id = SINGLETON_ID;
    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal commissionPercent = DEFAULT_COMMISSION_PERCENT;

    public BigDecimal getCommissionPercent() {
        return commissionPercent;
    }

    public void setCommissionPercent(BigDecimal commissionPercent) {
        this.commissionPercent = commissionPercent;
    }
}
