package order_service.repository;

import order_service.entity.PlatformSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlatformSettingRepository extends JpaRepository<PlatformSetting, Long> {
}
