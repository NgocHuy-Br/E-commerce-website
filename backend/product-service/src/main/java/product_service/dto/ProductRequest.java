package product_service.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/** Thông tin sản phẩm người bán đăng lên. */
public record ProductRequest(
        @NotNull(message = "Thiếu mã cửa hàng") Long storeId,

        @NotNull(message = "Hãy chọn danh mục") Long categoryId,

        @NotBlank(message = "Tên sản phẩm không được để trống") //
        // Cho chữ, số và các dấu hay gặp trong tên hàng: . , - _ / & + ( ) % : ' " # ! ?
        @Pattern(regexp = "^[\\p{L}\\p{N} .,\\-_/&+()%:'\"#!?]{2,200}$",
                message = "Tên sản phẩm chứa ký tự không được phép") String name,

        @Size(max = 4000, message = "Mô tả tối đa 4000 ký tự") String description,

        // Giá phải là số lớn hơn 0
        @NotNull(message = "Giá không được để trống") //
        @Positive(message = "Giá phải là số lớn hơn 0") //
        @DecimalMax(value = "999999999", message = "Giá tối đa là 999.999.999đ") //
        @Digits(integer = 9, fraction = 2, message = "Giá chỉ được có tối đa 2 số thập phân") //
        BigDecimal price,

        // Tồn kho là số nguyên không âm
        @PositiveOrZero(message = "Tồn kho phải là số không âm") //
        @Max(value = 100000, message = "Tồn kho tối đa 100.000 sản phẩm") int stockQuantity,

        @Pattern(regexp = "^$|^https?://\\S+$",
                message = "Ảnh phải là đường dẫn bắt đầu bằng http:// hoặc https://") //
        @Size(max = 500, message = "Đường dẫn ảnh tối đa 500 ký tự") String imageUrl) {
}
