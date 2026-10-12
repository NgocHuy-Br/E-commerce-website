package order_service.service;

import java.math.BigDecimal;
import order_service.entity.PlatformSetting;
import order_service.repository.PlatformSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Tỷ lệ phí nền tảng giữ lại trên giá trị mỗi đơn bán thành công. */
@Service
public class CommissionService {

    private final PlatformSettingRepository repository;

    public CommissionService(PlatformSettingRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public BigDecimal currentPercent() {
        return repository.findById(PlatformSetting.SINGLETON_ID).map(PlatformSetting::getCommissionPercent)
                .orElse(PlatformSetting.DEFAULT_COMMISSION_PERCENT);
    }

    /** Chỉ áp cho đơn tạo sau thời điểm đổi; đơn cũ giữ tỷ lệ đã chốt lúc đặt. */
    @Transactional
    public BigDecimal update(BigDecimal percent) {
        PlatformSetting setting = repository.findById(PlatformSetting.SINGLETON_ID).orElseGet(PlatformSetting::new);
        setting.setCommissionPercent(percent);
        return repository.save(setting).getCommissionPercent();
    }
}
