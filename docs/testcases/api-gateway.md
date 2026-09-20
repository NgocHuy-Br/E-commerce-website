# Test case — api-gateway

## 1. Thông tin chung

| Hạng mục | Nội dung |
|---|---|
| Service | api-gateway, cổng 8080 |
| Chức năng phụ trách | Định tuyến request tới đúng service, cấu hình CORS, chặn API nội bộ |
| Không có | Cơ sở dữ liệu, nghiệp vụ riêng |

Bảng định tuyến: `/api/auth/**` → 8081, `/api/users/**` → 8082, `/api/products/**` → 8083,
`/api/stores/**` → 8084, `/api/orders/**` → 8085.

## 2. Test case

| Mã | Mục đích | Cách kiểm tra | Kết quả mong đợi | HTTP | Ưu tiên | Tự động hoá |
|---|---|---|---|---|---|---|
| GW-01 | Định tuyến tới auth-service | `POST http://localhost:8080/api/auth/login` | Trả kết quả giống khi gọi trực tiếp cổng 8081 | 200 | Cao | API |
| GW-02 | Định tuyến tới product-service | `GET http://localhost:8080/api/products` | Trả danh sách sản phẩm | 200 | Cao | API |
| GW-03 | Định tuyến tới 3 service còn lại | `GET /api/users/me`, `/api/stores`, `/api/orders/vouchers/active` | Mỗi đường dẫn tới đúng service | 200/401 | Cao | API |
| GW-04 | Đường dẫn không tồn tại | `GET http://localhost:8080/api/khong-co` | Không định tuyến được | 404 | Trung bình | API |
| GW-05 | Chặn API nội bộ từ bên ngoài | `PUT http://localhost:8080/api/products/internal/1/reserve?quantity=1` kèm khoá đúng | Bị chặn ngay tại gateway dù khoá đúng | 404 | Cao | API |
| GW-06 | Service gọi nhau vẫn dùng được API nội bộ | Cùng request trên nhưng gọi trực tiếp `http://localhost:8083/...` | Thành công | 200 | Cao | API |
| GW-07 | CORS cho frontend | Gửi request `OPTIONS` kèm header `Origin: http://localhost:3000` | Trả về header `Access-Control-Allow-Origin: http://localhost:3000`, cho phép GET/POST/PUT/PATCH/DELETE | 200 | Cao | API |
| GW-08 | Service đích đang tắt | Tắt product-service rồi `GET /api/products` | Trả lỗi 5xx kèm log ở gateway (hạn chế đã biết: chưa có circuit breaker) | 5xx | Trung bình | Manual |

## 3. Gợi ý khi tự động hoá

```bash
GW=http://localhost:8080
KEY=nhom14-development-internal-key

# GW-05 (mong đợi 404)
curl -s -o /dev/null -w "qua gateway: %{http_code}\n" \
  -X PUT "$GW/api/products/internal/1/reserve?quantity=1" -H "X-Internal-Key: $KEY"

# GW-06 (mong đợi 200)
curl -s -o /dev/null -w "gọi trực tiếp: %{http_code}\n" \
  -X PUT "http://localhost:8083/api/products/internal/1/release?quantity=1" -H "X-Internal-Key: $KEY"

# GW-07
curl -s -i -X OPTIONS "$GW/api/products" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" | grep -i "access-control"
```

GW-06 làm thay đổi tồn kho nên chạy cặp reserve/release để dữ liệu trở về như cũ.
