package order_service.entity;

import jakarta.persistence.*;
import java.time.Instant;

/** Nhật ký thao tác của quản trị viên. */
@Entity
@Table(name = "audit_logs")
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long adminId;
    @Column(nullable = false, length = 150)
    private String adminEmail;
    @Column(nullable = false, length = 80)
    private String action;
    @Column(length = 500)
    private String detail;
    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected AuditLog() {
    }

    public AuditLog(Long adminId, String adminEmail, String action, String detail) {
        this.adminId = adminId;
        this.adminEmail = adminEmail;
        this.action = action;
        this.detail = detail;
    }

    public Long getId() {
        return id;
    }

    public Long getAdminId() {
        return adminId;
    }

    public String getAdminEmail() {
        return adminEmail;
    }

    public String getAction() {
        return action;
    }

    public String getDetail() {
        return detail;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
