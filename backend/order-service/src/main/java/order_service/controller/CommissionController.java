package order_service.controller;

import jakarta.validation.Valid;
import order_service.dto.CommissionRequest;
import order_service.dto.CommissionResponse;
import order_service.service.CommissionService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
public class CommissionController {
    private final CommissionService commissionService;

    public CommissionController(CommissionService commissionService) {
        this.commissionService = commissionService;
    }

    /** Người bán và admin xem được tỷ lệ phí hiện hành. */
    @GetMapping("/commission")
    @PreAuthorize("hasAnyRole('SELLER','BUYER','ADMIN')")
    public CommissionResponse get() {
        return new CommissionResponse(commissionService.currentPercent());
    }

    @PutMapping("/admin/commission")
    @PreAuthorize("hasRole('ADMIN')")
    public CommissionResponse update(@Valid @RequestBody CommissionRequest request) {
        return new CommissionResponse(commissionService.update(request.commissionPercent()));
    }
}
