# Bộ test case của hệ thống

Mỗi service có một file test case riêng, dùng được cho cả kiểm thử thủ công (manual)
và làm cơ sở viết kiểm thử tự động (automation).

| File | Service | Test case API | Test case giao diện | Tổng | Nội dung chính |
|---|---|---|---|---|---|
| [auth-service.md](auth-service.md) | auth-service (8081) | 24 | 8 | 32 | Đăng ký, đăng nhập, đổi mật khẩu, phân quyền, khoá tài khoản |
| [user-service.md](user-service.md) | user-service (8082) | 20 | 7 | 27 | Thông tin cá nhân, sổ địa chỉ giao hàng |
| [product-service.md](product-service.md) | product-service (8083) | 52 | 10 | 62 | Tìm kiếm, danh mục, đăng bán, khuyến mãi, tồn kho, kiểm duyệt |
| [store-service.md](store-service.md) | store-service (8084) | 21 | 6 | 27 | Mở cửa hàng, duyệt/từ chối/tạm ngưng cửa hàng |
| [order-service.md](order-service.md) | order-service (8085) | 65 | 15 | 80 | Giỏ hàng, đặt hàng, thanh toán, huỷ đơn, đánh giá, mã giảm giá |
| [api-gateway.md](api-gateway.md) | api-gateway (8080) | 8 | 0 | 8 | Định tuyến, CORS, chặn API nội bộ |

Tổng: **236 test case** (190 test case API + 46 test case giao diện).
Trong số đó **114 trường hợp đã có unit test tự động** (cột "Tự động hoá" ghi `Unit: TênFileTest`),
phần còn lại nên tự động hoá bằng script gọi API hoặc kiểm tra thủ công trên giao diện.

## Chuẩn bị môi trường trước khi test

```bash
# 1. Hạ tầng
docker compose -f infra/docker-compose.dev.yml up -d

# 2. Sáu service backend (mỗi lệnh một terminal)
cd backend/auth-service    && ./mvnw spring-boot:run
cd backend/user-service    && ./mvnw spring-boot:run
cd backend/product-service && ./mvnw spring-boot:run
cd backend/store-service   && ./mvnw spring-boot:run
cd backend/order-service   && ./mvnw spring-boot:run
cd backend/api-gateway     && ./mvnw spring-boot:run

# 3. Frontend
cd frontend && npm run dev
```

Mọi test case gọi API đều đi qua gateway `http://localhost:8080`.

## Dữ liệu dùng chung cho các test case

**Tài khoản**

| Vai trò | Email | Mật khẩu | userId | Quyền | Ghi chú |
|---|---|---|---|---|---|
| Quản trị viên | admin@nhom14.vn | admin123 | 1 | ADMIN | Không mua, không bán |
| Người bán 1 | seller@nhom14.vn | seller123 | 2 | BUYER, SELLER | Chủ cửa hàng id = 1 |
| Người mua | buyer@nhom14.vn | buyer123 | 3 | BUYER, SELLER | Có địa chỉ và đơn hàng mẫu |
| Người bán 2 | seller2@nhom14.vn | seller123 | 4 | BUYER, SELLER | Chủ cửa hàng id = 3, dùng để test đơn nhiều shop |

**Cửa hàng**

| id | Chủ | Tên | Trạng thái |
|---|---|---|---|
| 1 | userId 2 | Shop Công Nghệ 14 | ACTIVE |
| 3 | userId 4 | Shop Thoi Trang 14 | ACTIVE |

**Danh mục**: 1 = Điện tử, 2 = Thời trang, 3 = Gia dụng

**Sản phẩm**

| id | Cửa hàng | Danh mục | Tên | Giá gốc | Khuyến mãi | Giá bán | Tồn kho |
|---|---|---|---|---|---|---|---|
| 1 | 1 | 1 | Tai nghe Bluetooth Air 3 | 890.000 | -20% | 712.000 | 20 |
| 2 | 1 | 1 | Chuột không dây Logi M331 | 320.000 | không | 320.000 | 40 |
| 3 | 1 | 3 | Bình giữ nhiệt 500ml | 250.000 | không | 250.000 | 53 |
| 4 | 1 | 2 | Áo thun cotton basic | 180.000 | không | 180.000 | 94 |
| 6 | 1 | 1 | San pham test dong thoi | 100.000 | không | 100.000 | **0 (hết hàng)** |
| 7 | 3 | 2 | Mu luoi trai | 150.000 | không | 150.000 | 15 |

**Mã giảm giá**

| Mã | Giảm | Đơn tối thiểu | Lượt còn lại |
|---|---|---|---|
| NHOM14 | 10% | 500.000 | 42 |
| SALE15 | 15% | 200.000 | 50 |

Số tồn kho và số lượt mã giảm giá thay đổi theo mỗi lần chạy test, cần kiểm tra lại
bằng `GET /api/products` và `GET /api/orders/vouchers` trước khi bắt đầu.

Lấy token để gọi API:

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"buyer@nhom14.vn","password":"buyer123"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")
```

## Cách đọc một test case

Mỗi test case gồm đúng ba phần bắt buộc:

- **Scenario**: tình huống và các bước thực hiện.
- **Dữ liệu vào**: phương thức, đường dẫn, tài khoản dùng và nội dung body cụ thể.
- **Kết quả mong đợi**: mã HTTP, thông báo chính xác, và thay đổi dữ liệu (nếu có).

Kèm theo là mức ưu tiên và cách tự động hoá:

| Ký hiệu | Nghĩa |
|---|---|
| Unit `TênFileTest` | đã có unit test tự động, chạy bằng `./mvnw test` |
| API | nên tự động hoá bằng script gọi API (curl/Postman/RestAssured) |
| Manual | cần người kiểm tra trên giao diện |

## Quy ước mức ưu tiên

- **Cao**: luồng nghiệp vụ chính, sai là không dùng được hệ thống.
- **Trung bình**: ràng buộc dữ liệu, phân quyền.
- **Thấp**: trường hợp biên, ít gặp.
