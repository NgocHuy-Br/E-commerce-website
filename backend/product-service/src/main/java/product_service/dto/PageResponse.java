package product_service.dto;

import java.util.List;
import org.springframework.data.domain.Page;

/** Kết quả phân trang trả về cho frontend. */
public record PageResponse<T>(List<T> items, int page, int size, long totalItems, int totalPages, boolean hasNext) {

    public static <S, T> PageResponse<T> of(Page<S> page, List<T> items) {
        return new PageResponse<>(items, page.getNumber(), page.getSize(), page.getTotalElements(),
                page.getTotalPages(), page.hasNext());
    }
}
