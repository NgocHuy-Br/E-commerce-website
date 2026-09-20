package order_service.controller;

import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import order_service.dto.VoucherRequest;
import order_service.dto.VoucherResponse;
import order_service.entity.Voucher;
import order_service.repository.VoucherRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/orders/vouchers")
public class VoucherController {
    private final VoucherRepository voucherRepository;

    public VoucherController(VoucherRepository voucherRepository) {
        this.voucherRepository = voucherRepository;
    }

    /** Mã giảm giá còn hiệu lực cho người mua chọn khi thanh toán. */
    @GetMapping("/active")
    @Transactional(readOnly = true)
    public List<VoucherResponse> getActive() {
        return voucherRepository.findActive(Instant.now()).stream().map(this::toResponse).toList();
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<VoucherResponse> getAll() {
        return voucherRepository.findAllByOrderByIdDesc().stream().map(this::toResponse).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public VoucherResponse create(@Valid @RequestBody VoucherRequest request) {
        if (!request.endsAt().isAfter(request.startsAt())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Thời gian kết thúc phải sau thời gian bắt đầu");
        }
        if (request.endsAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã giảm giá đã hết hạn");
        }
        String code = request.code().trim().toUpperCase();
        if (voucherRepository.existsByCodeIgnoreCase(code)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Mã giảm giá đã tồn tại");
        }
        return toResponse(voucherRepository.save(new Voucher(code, request.discountPercent(),
                request.minimumOrderAmount(), request.remainingUses(), request.startsAt(), request.endsAt())));
    }

    @DeleteMapping("/{voucherId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public void delete(@PathVariable Long voucherId) {
        Voucher voucher = voucherRepository.findById(voucherId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy mã giảm giá"));
        voucherRepository.delete(voucher);
    }

    private VoucherResponse toResponse(Voucher voucher) {
        return new VoucherResponse(voucher.getId(), voucher.getCode(), voucher.getDiscountPercent(),
                voucher.getMinimumOrderAmount(), voucher.getRemainingUses(), voucher.getStartsAt(),
                voucher.getEndsAt());
    }
}
