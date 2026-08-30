package user_service.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import user_service.entity.UserProfile;

public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {
    Optional<UserProfile> findByUserId(Long userId);
}
