package order_service.controller;

import jakarta.validation.Valid;
import order_service.dto.VoucherRequest;
import order_service.entity.Voucher;
import order_service.repository.VoucherRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders/vouchers")
public class VoucherController {
    private final VoucherRepository voucherRepository;

    public VoucherController(VoucherRepository voucherRepository) {
        this.voucherRepository = voucherRepository;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public Voucher create(@Valid @RequestBody VoucherRequest request) {
        if (!request.endsAt().isAfter(request.startsAt()))
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Voucher end time must be after start time");
        return voucherRepository.save(new Voucher(request.code().trim().toUpperCase(), request.discountPercent(),
                request.minimumOrderAmount(), request.remainingUses(), request.startsAt(), request.endsAt()));
    }
}