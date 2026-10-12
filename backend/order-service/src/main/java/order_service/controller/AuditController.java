package order_service.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import order_service.entity.AuditLog;
import order_service.repository.AuditLogRepository;
import order_service.security.AuthPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Nhật ký thao tác quản trị: giao diện admin ghi lại sau mỗi thao tác thành
 * công.
 */
@RestController
@RequestMapping("/api/orders/admin/audit")
@PreAuthorize("hasRole('ADMIN')")
public class AuditController {

    public record AuditRequest(
            @NotBlank(message = "Thiếu tên thao tác") @Size(max = 80, message = "Tên thao tác tối đa 80 ký tự") String action,
            @Size(max = 500, message = "Chi tiết tối đa 500 ký tự") String detail) {
    }

    public record AuditResponse(Long id, Long adminId, String adminEmail, String action, String detail,
            Instant createdAt) {
        static AuditResponse of(AuditLog log) {
            return new AuditResponse(log.getId(), log.getAdminId(), log.getAdminEmail(), log.getAction(),
                    log.getDetail(), log.getCreatedAt());
        }
    }

    private final AuditLogRepository repository;

    public AuditController(AuditLogRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<AuditResponse> latest() {
        return repository.findTop200ByOrderByIdDesc().stream().map(AuditResponse::of).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AuditResponse record(@AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody AuditRequest request) {
        return AuditResponse.of(repository.save(
                new AuditLog(principal.userId(), principal.email(), request.action().trim(), request.detail())));
    }
}
