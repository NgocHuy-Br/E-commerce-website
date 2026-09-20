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

## Tài khoản dùng chung cho các test case

| Vai trò | Email | Mật khẩu | Ghi chú |
|---|---|---|---|
| Quản trị viên | admin@nhom14.vn | admin123 | Chỉ quản trị, không mua bán |
| Người bán 1 | seller@nhom14.vn | seller123 | Chủ cửa hàng số 1 (ACTIVE) |
| Người bán 2 | seller2@nhom14.vn | seller123 | Chủ cửa hàng số 3, dùng để test đơn nhiều shop |
| Người mua | buyer@nhom14.vn | buyer123 | Có sẵn địa chỉ và đơn hàng mẫu |

Lấy token để gọi API:

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"buyer@nhom14.vn","password":"buyer123"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")
```

## Cách đọc cột "Tự động hoá"

| Ký hiệu | Nghĩa |
|---|---|
| `Unit: TênFileTest` | đã có unit test tự động, chạy bằng `./mvnw test` |
| `API` | nên tự động hoá bằng script gọi API (curl/Postman/RestAssured) |
| `Manual` | cần người kiểm tra trên giao diện |

## Quy ước mức ưu tiên

- **Cao**: luồng nghiệp vụ chính, sai là không dùng được hệ thống.
- **Trung bình**: ràng buộc dữ liệu, phân quyền.
- **Thấp**: trường hợp biên, ít gặp.
