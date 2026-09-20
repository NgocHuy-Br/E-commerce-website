# Test case — store-service

## 1. Thông tin chung

| Hạng mục | Nội dung |
|---|---|
| Service | store-service, cổng 8084 |
| Gọi qua gateway | `http://localhost:8080/api/stores` |
| Cơ sở dữ liệu | MySQL `db_store` (cổng 3313), bảng `stores` |
| Chức năng phụ trách | Mở cửa hàng, cập nhật cửa hàng, quy trình duyệt của quản trị viên |
| Phụ thuộc | Gọi auth-service để cấp quyền SELLER; gọi product-service để ẩn/hiện sản phẩm |

Trạng thái cửa hàng: `PENDING` (chờ duyệt) → `ACTIVE` (hoạt động) / `REJECTED` (từ chối) / `SUSPENDED` (tạm ngưng).

## 2. Test case API

| Mã | Mục đích | Phương thức & đường dẫn | Dữ liệu / điều kiện | Kết quả mong đợi | HTTP | Ưu tiên | Tự động hoá |
|---|---|---|---|---|---|---|---|
| STORE-01 | Khách xem danh sách cửa hàng | `GET /` | không cần token | Chỉ trả cửa hàng ACTIVE | 200 | Trung bình | API |
| STORE-02 | Khách xem chi tiết cửa hàng | `GET /{id}` | cửa hàng ACTIVE | Trả thông tin cửa hàng | 200 | Trung bình | API |
| STORE-03 | Cửa hàng chưa duyệt thì khách không xem được | `GET /{id}` | cửa hàng PENDING | "Không tìm thấy cửa hàng" | 404 | Cao | Unit: StoreServiceTest |
| STORE-04 | Gửi yêu cầu mở cửa hàng | `POST /` | token người mua, chưa có cửa hàng | Tạo cửa hàng trạng thái PENDING | 201 | Cao | Unit: StoreServiceApplicationTests |
| STORE-05 | Mỗi tài khoản chỉ mở một cửa hàng | `POST /` | tài khoản đã có cửa hàng | "Mỗi tài khoản chỉ mở được một cửa hàng" | 409 | Cao | Unit: StoreServiceTest |
| STORE-06 | Tên cửa hàng chứa ký tự lạ | `POST /` | name = `Shop <script>` | "Tên cửa hàng chứa ký tự không được phép" | 400 | Trung bình | Unit: StoreRequestValidationTest |
| STORE-07 | Số điện thoại sai định dạng | `POST /` | phoneNumber = `abc123` hoặc `123` | "Số điện thoại phải là 10 chữ số bắt đầu bằng 0, hoặc hotline 1900/1800" | 400 | Trung bình | Unit: StoreRequestValidationTest |
| STORE-08 | Cho phép số hotline | `PUT /mine` | phoneNumber = `19001234` | Lưu thành công | 200 | Trung bình | Unit: StoreRequestValidationTest |
| STORE-09 | Logo không phải đường dẫn http | `POST /` | logoUrl = `logo.png` | "Logo phải là đường dẫn bắt đầu bằng http://..." | 400 | Thấp | Unit: StoreRequestValidationTest |
| STORE-10 | Thiếu trường bắt buộc | `POST /` | để trống địa chỉ | fieldErrors.address | 400 | Trung bình | API |
| STORE-11 | Xem cửa hàng của mình | `GET /mine` | người bán đã có cửa hàng | Trả cửa hàng kèm trạng thái | 200 | Cao | API |
| STORE-12 | Chưa có cửa hàng thì báo không tìm thấy | `GET /mine` | tài khoản chưa mở cửa hàng | "Không tìm thấy cửa hàng" | 404 | Trung bình | API |
| STORE-13 | Cập nhật thông tin cửa hàng | `PUT /mine` | đổi mô tả, địa chỉ | Lưu thành công, trạng thái không đổi | 200 | Cao | Unit: StoreServiceTest |
| STORE-14 | Cửa hàng bị từ chối sửa lại thì được chờ duyệt lần nữa | `PUT /mine` | cửa hàng đang REJECTED | Trạng thái chuyển về PENDING | 200 | Cao | Unit: StoreServiceTest |
| STORE-15 | Xác minh cửa hàng của chính mình | `GET /{id}/verification` | id là cửa hàng của mình | Trả id, ownerId, status | 200 | Trung bình | API |
| STORE-16 | Không xác minh được cửa hàng người khác | `GET /{id}/verification` | id của cửa hàng khác | "Cửa hàng không thuộc về người bán này" | 403 | Cao | Unit: StoreServiceTest |
| STORE-17 | Admin xem danh sách cửa hàng theo trạng thái | `GET /admin?status=PENDING` | token admin | Danh sách đúng theo trạng thái lọc | 200 | Cao | API |
| STORE-18 | Người bán không xem được danh sách quản trị | `GET /admin` | token người bán | Không có quyền | 403 | Cao | API |
| STORE-19 | Duyệt cửa hàng | `PUT /{id}/status` | status = `ACTIVE` | Cửa hàng ACTIVE; chủ shop được cấp quyền SELLER; sản phẩm của shop hiện lại trên sàn | 200 | Cao | Unit: StoreServiceTest |
| STORE-20 | Tạm ngưng cửa hàng thì ẩn luôn sản phẩm | `PUT /{id}/status` | status = `SUSPENDED` | Cửa hàng SUSPENDED; `GET /api/products` không còn sản phẩm của shop đó | 200 | Cao | Unit: StoreServiceTest |
| STORE-21 | Thống kê cửa hàng | `GET /admin/statistics` | token admin | totalStores, pendingStores, activeStores, rejectedStores, suspendedStores | 200 | Trung bình | API |

## 3. Test case giao diện (kiểm thử thủ công)

| Mã | Màn hình | Thao tác | Kết quả mong đợi |
|---|---|---|---|
| STORE-UI-01 | `/seller` tab Cửa hàng | Tài khoản chưa có shop, điền form và bấm Gửi yêu cầu mở shop | Hiện nhãn "Chờ admin duyệt", thông báo xanh |
| STORE-UI-02 | `/seller` tab Đăng bán | Cửa hàng còn PENDING | Hiện dòng "Cửa hàng cần được admin duyệt (ACTIVE) trước khi đăng bán" |
| STORE-UI-03 | `/admin` tab Cửa hàng | Bấm Duyệt một cửa hàng PENDING | Nhãn đổi sang "Đang hoạt động"; chủ shop đăng nhập lại sẽ có quyền SELLER |
| STORE-UI-04 | `/admin` tab Cửa hàng | Bấm Tạm ngưng một cửa hàng ACTIVE | Trang chủ không còn sản phẩm của cửa hàng đó |
| STORE-UI-05 | `/seller` tab Đăng bán | Sau khi shop bị tạm ngưng, bấm Hiện một sản phẩm | Thông báo đỏ "Cửa hàng của bạn đang bị tạm ngưng nên chưa thể mở bán lại sản phẩm" |
| STORE-UI-06 | `/seller` tab Cửa hàng | Nhập số điện thoại có chữ | Chữ không hiện ra vì ô chỉ nhận số |

## 4. Gợi ý khi tự động hoá

```bash
GW=http://localhost:8080
ADMIN=... # token admin

# STORE-20: tạm ngưng rồi kiểm tra sản phẩm biến khỏi sàn
BEFORE=$(curl -s $GW/api/products | jq length)
curl -s -o /dev/null -X PUT $GW/api/stores/1/status -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' -d '{"status":"SUSPENDED"}'
AFTER=$(curl -s $GW/api/products | jq length)
echo "trước: $BEFORE, sau: $AFTER"   # AFTER phải nhỏ hơn BEFORE

# trả lại trạng thái ban đầu
curl -s -o /dev/null -X PUT $GW/api/stores/1/status -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' -d '{"status":"ACTIVE"}'
```

STORE-19 và STORE-20 làm thay đổi dữ liệu dùng chung nên **luôn phải trả cửa hàng về ACTIVE**
sau khi chạy, nếu không các test case của product-service và order-service sẽ sai theo.
