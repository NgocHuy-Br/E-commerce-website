# Test case — product-service

## 1. Thông tin chung

| Hạng mục | Nội dung |
|---|---|
| Service | product-service, cổng 8083 |
| Gọi qua gateway | `http://localhost:8080/api/products` |
| Cơ sở dữ liệu | MySQL `db_product` (cổng 3312), bảng `categories`, `products`, `promotions` |
| Chức năng phụ trách | Danh mục, tìm kiếm hàng hoá, đăng bán, khuyến mãi, tồn kho, kiểm duyệt |
| Phụ thuộc | Gọi store-service để xác minh cửa hàng khi đăng bán |

Trạng thái sản phẩm: `ACTIVE` (đang bán) / `HIDDEN` (người bán hoặc admin ẩn) / `OUT_OF_STOCK` (hết hàng).
Ngoài ra còn cờ `hiddenByStore` bật khi cửa hàng bị tạm ngưng.

## 2. Test case API — tìm kiếm (công khai, không cần token)

| Mã | Mục đích | Phương thức & đường dẫn | Dữ liệu / điều kiện | Kết quả mong đợi | HTTP | Ưu tiên | Tự động hoá |
|---|---|---|---|---|---|---|---|
| PROD-01 | Xem toàn bộ sản phẩm đang bán | `GET /` | không token | Chỉ trả sản phẩm ACTIVE và không bị ẩn theo cửa hàng | 200 | Cao | Unit: ProductServiceTest |
| PROD-02 | Tìm theo từ khoá | `GET /?keyword=tai nghe` | có sản phẩm khớp tên | Chỉ trả sản phẩm có tên chứa từ khoá (không phân biệt hoa thường) | 200 | Cao | API |
| PROD-03 | Tìm từ khoá không có kết quả | `GET /?keyword=xyzabc` | không sản phẩm nào khớp | Trả danh sách rỗng `[]` | 200 | Trung bình | API |
| PROD-04 | Lọc theo danh mục | `GET /?categoryId=1` | danh mục có sản phẩm | Chỉ trả sản phẩm thuộc danh mục đó | 200 | Cao | API |
| PROD-05 | Lọc theo khoảng giá | `GET /?minPrice=200000&maxPrice=500000` | — | Mọi sản phẩm trả về có giá gốc trong khoảng | 200 | Cao | API |
| PROD-06 | Sắp xếp giá tăng dần | `GET /?sort=price_asc` | — | Danh sách tăng dần theo giá | 200 | Trung bình | API |
| PROD-07 | Sắp xếp giá giảm dần / tên A-Z / mới nhất | `GET /?sort=price_desc`, `sort=name`, `sort=newest` | — | Thứ tự đúng theo từng kiểu | 200 | Trung bình | API |
| PROD-08 | Giá trị sort lạ | `GET /?sort=abcxyz` | — | Không lỗi, quay về sắp xếp mới nhất | 200 | Thấp | API |
| PROD-09 | Xem chi tiết sản phẩm | `GET /{id}` | sản phẩm ACTIVE | Trả price, discountPercent, effectivePrice, stockQuantity | 200 | Cao | API |
| PROD-10 | Sản phẩm bị ẩn thì không xem được | `GET /{id}` | sản phẩm HIDDEN | "Không tìm thấy sản phẩm" | 404 | Cao | Unit: ProductServiceTest |
| PROD-11 | Sản phẩm của cửa hàng tạm ngưng | `GET /{id}` | hiddenByStore = true | "Không tìm thấy sản phẩm" | 404 | Cao | Unit: ProductServiceTest |
| PROD-12 | Id không tồn tại | `GET /999999` | — | "Không tìm thấy sản phẩm" | 404 | Thấp | API |
| PROD-13 | Xem danh mục | `GET /categories` | không token | Danh sách danh mục | 200 | Cao | API |
| PROD-14 | Xem khuyến mãi của sản phẩm | `GET /{id}/promotions` | không token | Danh sách khuyến mãi kèm thời gian | 200 | Trung bình | API |
| PROD-15 | Giá sau khuyến mãi tính đúng | `GET /{id}` | sản phẩm 890.000đ, khuyến mãi 20% | effectivePrice = 712.000, discountPercent = 20 | 200 | Cao | Unit: PricingServiceTest |
| PROD-16 | Nhiều khuyến mãi thì lấy mức cao nhất | `GET /{id}` | 2 khuyến mãi 10% và 30% cùng hiệu lực | discountPercent = 30 | 200 | Trung bình | Unit: PricingServiceTest |

## 3. Test case API — người bán

| Mã | Mục đích | Phương thức & đường dẫn | Dữ liệu / điều kiện | Kết quả mong đợi | HTTP | Ưu tiên | Tự động hoá |
|---|---|---|---|---|---|---|---|
| PROD-17 | Đăng bán sản phẩm | `POST /` | token SELLER, cửa hàng ACTIVE, dữ liệu đúng | Tạo sản phẩm, trạng thái ACTIVE | 201 | Cao | Unit: ProductServiceTest |
| PROD-18 | Người mua không đăng bán được | `POST /` | token BUYER | Không có quyền | 403 | Cao | API |
| PROD-19 | Cửa hàng chưa duyệt thì không đăng bán được | `POST /` | cửa hàng PENDING | "Bạn cần một cửa hàng đang hoạt động để đăng bán" | 403 | Cao | API |
| PROD-20 | Tên sản phẩm có dấu nháy, hai chấm | `POST /` | name = `Laptop Dell 15.6" FHD`, `Combo: 2 sản phẩm` | Tạo thành công | 201 | Trung bình | Unit: ProductRequestValidationTest |
| PROD-21 | Tên sản phẩm chứa thẻ script | `POST /` | name = `Test <script>` | "Tên sản phẩm chứa ký tự không được phép" | 400 | Cao | Unit: ProductRequestValidationTest |
| PROD-22 | Giá bằng 0 hoặc âm | `POST /` | price = 0 / -5000 | "Giá phải là số lớn hơn 0" | 400 | Cao | Unit: ProductRequestValidationTest |
| PROD-23 | Giá quá lớn | `POST /` | price = 1000000000 | "Giá tối đa là 999.999.999đ" | 400 | Thấp | API |
| PROD-24 | Giá quá 2 số thập phân | `POST /` | price = 100.555 | "Giá chỉ được có tối đa 2 số thập phân" | 400 | Trung bình | Unit: ProductRequestValidationTest |
| PROD-25 | Tồn kho âm | `POST /` | stockQuantity = -1 | "Tồn kho phải là số không âm" | 400 | Trung bình | Unit: ProductRequestValidationTest |
| PROD-26 | Tồn kho bằng 0 | `POST /` | stockQuantity = 0 | Tạo được, trạng thái OUT_OF_STOCK | 201 | Trung bình | Unit: ProductTest |
| PROD-27 | Chữ ở ô số | `POST /` | price = `"abc"` | "Dữ liệu gửi lên không đúng định dạng" | 400 | Trung bình | API |
| PROD-28 | Danh mục không tồn tại | `POST /` | categoryId = 9999 | "Không tìm thấy danh mục" | 404 | Trung bình | API |
| PROD-29 | Xem sản phẩm của shop mình | `GET /mine` | token SELLER | Chỉ sản phẩm của chính mình, gồm cả sản phẩm đang ẩn | 200 | Cao | API |
| PROD-30 | Sửa sản phẩm của mình | `PUT /{id}` | id thuộc về mình | Cập nhật thành công | 200 | Cao | API |
| PROD-31 | Không sửa được sản phẩm người khác | `PUT /{id}` | id của người bán khác | "Không tìm thấy sản phẩm" | 404 | Cao | Unit: ProductServiceTest |
| PROD-32 | Tự ẩn và hiện lại sản phẩm | `PUT /{id}/visibility?visible=false` rồi `true` | id thuộc về mình | Ẩn: biến khỏi `GET /`. Hiện lại: xuất hiện trở lại | 200 | Cao | API |
| PROD-33 | Cửa hàng tạm ngưng thì không hiện lại được | `PUT /{id}/visibility?visible=true` | hiddenByStore = true | "Cửa hàng của bạn đang bị tạm ngưng nên chưa thể mở bán lại sản phẩm" | 400 | Cao | Unit: ProductServiceTest |
| PROD-34 | Tham số visible sai kiểu | `PUT /{id}/visibility?visible=xyz` | — | "Giá trị của tham số 'visible' không hợp lệ" | 400 | Thấp | API |

## 4. Test case API — khuyến mãi (người bán)

| Mã | Mục đích | Phương thức & đường dẫn | Dữ liệu / điều kiện | Kết quả mong đợi | HTTP | Ưu tiên | Tự động hoá |
|---|---|---|---|---|---|---|---|
| PROD-35 | Đăng khuyến mãi | `POST /{id}/promotions` | discountPercent = 20, thời gian hợp lệ | Tạo thành công; `GET /{id}` có effectivePrice giảm 20% | 201 | Cao | API |
| PROD-36 | Phần trăm ngoài khoảng 1-90 | `POST /{id}/promotions` | discountPercent = 0 / 95 | "Phần trăm giảm phải từ 1 đến 90" | 400 | Trung bình | API |
| PROD-37 | Thời gian kết thúc trước thời gian bắt đầu | `POST /{id}/promotions` | endsAt < startsAt | "Thời gian kết thúc khuyến mãi phải sau thời gian bắt đầu" | 400 | Trung bình | API |
| PROD-38 | Khuyến mãi đã hết hạn | `POST /{id}/promotions` | endsAt ở quá khứ | "Khuyến mãi đã hết hạn" | 400 | Trung bình | API |
| PROD-39 | Khuyến mãi cho sản phẩm người khác | `POST /{id}/promotions` | id của người bán khác | "Không tìm thấy sản phẩm" | 404 | Cao | API |
| PROD-40 | Xem và xoá khuyến mãi của shop | `GET /mine/promotions`, `DELETE /promotions/{id}` | token SELLER | Xem được danh sách; xoá thành công (204); xoá của người khác thì 404 | 200 / 204 / 404 | Trung bình | API |

## 5. Test case API — quản trị viên và gọi nội bộ

| Mã | Mục đích | Phương thức & đường dẫn | Dữ liệu / điều kiện | Kết quả mong đợi | HTTP | Ưu tiên | Tự động hoá |
|---|---|---|---|---|---|---|---|
| PROD-41 | Thêm và sửa danh mục | `POST /categories`, `PUT /categories/{id}` | token admin | Tạo (201) và sửa (200) thành công | 201 / 200 | Cao | API |
| PROD-42 | Người bán không tạo danh mục | `POST /categories` | token SELLER | Không có quyền | 403 | Cao | API |
| PROD-43 | Tên danh mục trùng | `POST /categories` | tên đã tồn tại | "Dữ liệu đã tồn tại hoặc không hợp lệ" | 409 | Thấp | API |
| PROD-44 | Admin xem toàn bộ sản phẩm | `GET /admin?status=HIDDEN` | token admin | Gồm cả sản phẩm đang ẩn của mọi shop | 200 | Cao | API |
| PROD-45 | Admin ẩn sản phẩm khỏi sàn | `PUT /{id}/status?status=HIDDEN` | token admin | Sản phẩm biến khỏi `GET /` | 200 | Cao | API |
| PROD-46 | Trạng thái không hợp lệ | `PUT /{id}/status?status=XYZ` | — | "Giá trị của tham số 'status' không hợp lệ" | 400 | Thấp | API |
| PROD-47 | Thống kê catalog | `GET /admin/statistics` | token admin | totalProducts, activeProducts, hiddenProducts, outOfStockProducts, totalCategories, activePromotions | 200 | Trung bình | API |
| PROD-48 | Trừ kho qua API nội bộ | `PUT /internal/{id}/reserve?quantity=2` | header `X-Internal-Key` đúng, gọi trực tiếp cổng 8083 | Tồn kho giảm 2, trả về giá chốt đơn | 200 | Cao | Unit: ProductServiceTest |
| PROD-49 | Sai khoá nội bộ | `PUT /internal/{id}/reserve` | header sai hoặc thiếu | "Khoá nội bộ không hợp lệ" | 403 | Cao | API |
| PROD-50 | Trừ quá tồn kho | `PUT /internal/{id}/reserve?quantity=9999` | — | "Sản phẩm ... chỉ còn N sản phẩm" | 400 | Cao | Unit: ProductServiceTest |
| PROD-51 | Hoàn kho | `PUT /internal/{id}/release?quantity=2` | — | Tồn kho cộng lại; sản phẩm hết hàng được mở bán lại | 200 | Cao | Unit: ProductTest |
| PROD-52 | Chống bán vượt kho khi nhiều người mua cùng lúc | 10 lần `reserve?quantity=1` song song | sản phẩm chỉ còn 3 | Đúng 3 lần thành công, 7 lần bị từ chối, tồn kho = 0 (không âm) | 200/400 | Cao | API (script song song) |

## 6. Test case giao diện (kiểm thử thủ công)

| Mã | Màn hình | Thao tác | Kết quả mong đợi |
|---|---|---|---|
| PROD-UI-01 | `/` | Nhập từ khoá rồi Enter | Danh sách lọc lại đúng từ khoá |
| PROD-UI-02 | `/` | Chọn danh mục + khoảng giá + sắp xếp rồi bấm Tìm kiếm | Kết quả khớp cả ba điều kiện |
| PROD-UI-03 | `/` | Xem thẻ sản phẩm có khuyến mãi | Giá gốc bị gạch ngang, nhãn đỏ `-20%`, giá mới màu xanh |
| PROD-UI-04 | `/products/1` | Mở trang chi tiết | Hiện mô tả, khuyến mãi đang chạy, điểm sao và danh sách nhận xét |
| PROD-UI-05 | `/seller` tab Đăng bán | Nhập giá có chữ | Chữ không hiện ra vì ô chỉ nhận số |
| PROD-UI-06 | `/seller` tab Đăng bán | Bỏ trống tên rồi bấm Đăng bán | Ô viền đỏ kèm chữ đỏ, không gọi API |
| PROD-UI-07 | `/seller` tab Đăng bán | Bấm Khuyến mãi, nhập 20% | Popup hiện "Giá gốc ... → giá sau giảm ..." đúng số tiền |
| PROD-UI-08 | `/seller` tab Đăng bán | Bấm Ẩn một sản phẩm | Nhãn đổi thành HIDDEN, trang chủ không còn sản phẩm đó |
| PROD-UI-09 | `/admin` tab Danh mục & sản phẩm | Lọc theo trạng thái HIDDEN | Chỉ hiện sản phẩm đang ẩn |
| PROD-UI-10 | `/admin` tab Danh mục & sản phẩm | Bấm Ẩn khỏi sàn | Sản phẩm biến khỏi trang chủ nhưng người bán vẫn thấy trong `/seller` |

## 7. Gợi ý khi tự động hoá

```bash
GW=http://localhost:8080
KEY=nhom14-development-internal-key

# PROD-52: kiểm tra chống bán vượt kho (chạy song song)
for i in $(seq 1 10); do
  curl -s -o "/tmp/r$i.json" -X PUT "http://localhost:8083/api/products/6/reserve?quantity=1" \
    -H "X-Internal-Key: $KEY" &
done
wait
grep -l stockQuantity /tmp/r*.json | wc -l   # phải bằng số tồn kho ban đầu

# PROD-49 (mong đợi 403)
curl -s -o /dev/null -w "%{http_code}\n" -X PUT \
  "http://localhost:8083/api/products/1/reserve?quantity=1" -H "X-Internal-Key: sai-khoa"
```

Các API `internal/**` **chỉ gọi được trực tiếp vào cổng 8083**; gọi qua gateway 8080 sẽ nhận 404 (xem GW-05).
