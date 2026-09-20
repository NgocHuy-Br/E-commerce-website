package product_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Danh mục hàng hoá do quản trị viên tạo. */
public record CategoryRequest(
        @NotBlank(message = "Tên danh mục không được để trống") //
        @Pattern(regexp = "^[\\p{L}\\p{N} .,\\-&/()]{2,100}$",
                message = "Tên danh mục chứa ký tự không được phép") String name,

        @Size(max = 500, message = "Mô tả tối đa 500 ký tự") String description) {
}
