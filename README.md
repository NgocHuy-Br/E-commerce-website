# Nền tảng thương mại điện tử trên kiến trúc Microservices — Nhóm 14

Sàn TMĐT nhiều người bán (multi-vendor) gồm 5 microservice Spring Boot, một API Gateway và
frontend Next.js. Mỗi service có database riêng (database-per-service), giao tiếp qua REST.

## 1. Kiến trúc

```
frontend (Next.js 16, :3000)
        │  REST + JWT
   api-gateway (:8080)              ← điểm vào duy nhất, định tuyến theo path + CORS
        ├── /api/auth/**     → auth-service    :8081 → MySQL :3310 db_auth
        ├── /api/users/**    → user-service    :8082 → MySQL :3311 db_user
        ├── /api/products/** → product-service :8083 → MySQL :3312 db_product
        ├── /api/stores/**   → store-service   :8084 → MySQL :3313 db_store
        └── /api/orders/**   → order-service   :8085 → MySQL :3314 db_order + Redis :6379
```

Gọi nội bộ giữa các service:

| Từ | Đến | Mục đích |
|---|---|---|
| store-service | auth-service | Cấp quyền `SELLER` khi admin duyệt cửa hàng |
| product-service | store-service | Xác minh người bán sở hữu cửa hàng đang ACTIVE |
| order-service | product-service | Lấy giá/tồn kho, trừ kho khi đặt, hoàn kho khi huỷ |
| order-service | store-service | Xác định đơn nào thuộc cửa hàng của người bán |

### So sánh với kiến trúc khác

| Tiêu chí | Monolith | Microservices (dự án này) |
|---|---|---|
| Triển khai | 1 artifact | 6 artifact độc lập |
| Database | 1 schema dùng chung | mỗi service 1 schema riêng |
| Mở rộng | scale toàn bộ ứng dụng | scale riêng service nghẽn (vd. product) |
| Lỗi lan truyền | 1 lỗi có thể sập cả app | khoanh vùng theo service |
| Chi phí | thấp | cao hơn: vận hành, dữ liệu phân tán, nhất quán cuối |

### Công nghệ

- **Backend**: Java 21, Spring Boot 4.1.1 (Web MVC, Data JPA, Security, Validation), Spring Cloud Gateway, JJWT.
- **Database**: MySQL 8 (mỗi service một DB), Redis 7 (giỏ hàng).
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4.
- **Xác thực**: JWT HS256 stateless; token mang `sub`, `email`, `roles`; mỗi service tự xác thực token.

## 2. Nghiệp vụ đã hiện thực

### Chức năng chung
- Đăng ký, đăng nhập (JWT), đăng xuất, xem tài khoản hiện tại.
- Đổi mật khẩu.
- Quản lý thông tin cá nhân: họ tên, số điện thoại, ảnh đại diện.
- Sổ địa chỉ giao hàng: thêm/sửa/xoá, đặt địa chỉ mặc định.

### Quản trị viên
- Quản lý tài khoản: xem danh sách, cấp/thu quyền `SELLER`/`ADMIN`, khoá/mở khoá tài khoản.
- Duyệt cửa hàng: `PENDING → ACTIVE` (tự động cấp quyền SELLER cho chủ shop), từ chối, tạm ngưng.
- Quản lý danh mục hàng hoá: thêm, sửa.
- Kiểm duyệt sản phẩm: xem toàn bộ sản phẩm theo trạng thái, ẩn/cho bán lại.
- Quản lý mã giảm giá toàn sàn: tạo, xem, xoá.
- Theo dõi và can thiệp đơn hàng toàn sàn.
- Thống kê nền tảng: tài khoản, cửa hàng, sản phẩm, khuyến mãi, đơn hàng, doanh thu, điểm đánh giá.

### Người bán
- Mở cửa hàng (chờ admin duyệt) và cập nhật thông tin cửa hàng.
- Đăng bán, sửa sản phẩm; tự ẩn/hiện sản phẩm của mình.
- Đăng khuyến mãi theo sản phẩm (phần trăm giảm + khoảng thời gian), xem và xoá khuyến mãi.
- Xem đơn hàng của shop và xử lý theo luồng: `PENDING → CONFIRMED → PACKING → SHIPPING → DELIVERED`, huỷ đơn khi cần.

### Người mua
- Tìm kiếm hàng hoá theo từ khoá, danh mục, khoảng giá; sắp xếp theo mới nhất/giá/tên.
- Xem chi tiết sản phẩm, khuyến mãi đang chạy và các đánh giá.
- Giỏ hàng trên Redis: thêm, sửa số lượng, xoá; giá và tồn kho luôn lấy từ product-service.
- Thanh toán: chọn địa chỉ đã lưu, chọn COD/chuyển khoản, áp mã giảm giá.
- Theo dõi đơn; bấm thanh toán sẽ hiện popup chọn phương thức (COD, chuyển khoản, MoMo, thẻ), thanh toán xong nút thanh toán tự ẩn.
- Huỷ đơn khi shop chưa giao: có popup xác nhận, báo trước việc hoàn tiền về tài khoản ngân hàng trong 1-3 ngày làm việc, hàng được hoàn kho.
- Đánh sao 1–5 và nhận xét sau khi đơn ở trạng thái `DELIVERED`, mỗi sản phẩm một lần trên mỗi đơn.

### Kiểm thử

```bash
cd backend/<ten-service> && ./mvnw test
```

34 test: auth-service 6, product-service 12, order-service 14,
user-service/store-service/api-gateway mỗi service 1. Phần lớn là unit test với Mockito
(không cần cơ sở dữ liệu), riêng `*ApplicationTests` cần MySQL đang chạy.
Các nhóm test chính: trạng thái tồn kho sản phẩm, tính giá sau khuyến mãi, tổng tiền đơn hàng,
tách đơn theo cửa hàng, quy tắc mã giảm giá và quy tắc phân quyền (ADMIN loại trừ BUYER/SELLER).

### Cơ chế đảm bảo dữ liệu đúng

- **Chống bán vượt tồn kho**: khi trừ hoặc hoàn kho, product-service khoá dòng sản phẩm
  (`PESSIMISTIC_WRITE`) nên nhiều đơn hàng cùng lúc không đọc chung một giá trị tồn cũ.
  Sản phẩm và mã giảm giá còn có `@Version` (khoá lạc quan) cho các đường ghi khác.
- **Đặt hàng gọi HTTP ngoài transaction**: order-service trừ kho ở product-service trước,
  rồi mới mở transaction ghi đơn, và chỉ dọn giỏ hàng sau khi đơn lưu thành công.
  Nếu bước ghi đơn thất bại thì toàn bộ phần kho đã trừ được hoàn lại.
- **Huỷ đơn hoàn lại mã giảm giá**: lượt dùng của voucher được cộng lại khi đơn bị huỷ.
- **Tạm ngưng cửa hàng là ẩn luôn sản phẩm**: store-service gọi
  `PUT /api/products/internal/store/{storeId}/visibility` nên sản phẩm của cửa hàng bị tạm ngưng
  hoặc từ chối biến khỏi sàn ngay, được duyệt lại thì mở bán lại.
- **Timeout khi gọi liên service**: `spring.http.client.connect-timeout=3s`, `read-timeout=8s`.
- **Giỏ hàng trong Redis có TTL 30 ngày**, không giữ dữ liệu rác vô hạn.
- **Mã lỗi đúng ngữ nghĩa**: 401 khi chưa đăng nhập hoặc token hết hạn (frontend tự đăng xuất),
  403 khi đã đăng nhập nhưng thiếu quyền, 409 khi tranh chấp dữ liệu hoặc trùng dữ liệu duy nhất.
- **Mỗi đơn hàng thuộc một cửa hàng**: giỏ hàng có sản phẩm của nhiều cửa hàng được tách thành
  nhiều đơn khi thanh toán, mã giảm giá theo phần trăm được áp cho từng đơn.
  Nhờ vậy người bán chỉ thấy và chỉ xử lý được đơn của chính cửa hàng mình.
- **Gateway chặn API nội bộ**: mọi đường dẫn chứa `/internal/` bị trả 404 ở gateway, chỉ service
  gọi trực tiếp cho nhau mới dùng được.
- **API đánh giá công khai không trả mã người mua và mã đơn hàng.**

### Quy tắc nghiệp vụ đáng chú ý
- Giá chốt đơn là giá sau khuyến mãi đang hiệu lực, do product-service trả về khi trừ kho — client không thể tự gửi giá.
- Huỷ đơn sẽ hoàn kho và chuyển thanh toán đã trả sang `REFUNDED`.
- Chuyển trạng thái đơn hàng được kiểm tra theo máy trạng thái, không cho nhảy bậc hay sửa đơn đã huỷ/đã giao.
- Đơn chỉ huỷ được khi còn ở `PENDING`, `CONFIRMED` hoặc `PACKING`. Từ `SHIPPING` trở đi **không ai huỷ được** — kể cả người bán và quản trị viên; đơn đã thanh toán khi huỷ sẽ chuyển sang `REFUNDED`.
- Mỗi chủ tài khoản chỉ mở được một cửa hàng; chỉ cửa hàng `ACTIVE` mới được đăng bán.
- Quản trị viên không truy cập được giỏ hàng, đặt hàng, đơn hàng của tôi, mở cửa hàng hay đăng bán (trả 403).

## 3. Chạy dự án

### Hạ tầng (MySQL + Redis)

```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

### Backend (mỗi service một terminal)

```bash
cd backend/auth-service    && ./mvnw spring-boot:run   # :8081
cd backend/user-service    && ./mvnw spring-boot:run   # :8082
cd backend/product-service && ./mvnw spring-boot:run   # :8083
cd backend/store-service   && ./mvnw spring-boot:run   # :8084
cd backend/order-service   && ./mvnw spring-boot:run   # :8085
cd backend/api-gateway     && ./mvnw spring-boot:run   # :8080
```

Yêu cầu JDK 21+. Các biến môi trường có thể ghi đè (đều có giá trị mặc định cho môi trường dev):
`JWT_SECRET`, `INTERNAL_API_KEY`, `PRODUCT_SERVICE_URL`, `STORE_SERVICE_URL`, `AUTH_SERVICE_URL`,
`REDIS_HOST`, `REDIS_PORT`, `app.cors.allowed-origins`.

### Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
```

Các trang (Next.js App Router):

| Route | Nội dung |
|---|---|
| `/` | Trang chủ: tìm kiếm, lọc, sắp xếp sản phẩm; thêm vào giỏ trực tiếp |
| `/login` | Trang đăng nhập / đăng ký riêng, hỗ trợ `?next=` để quay lại trang trước |
| `/products/[id]` | Trang chi tiết sản phẩm: khuyến mãi, đánh giá & bình luận, thêm vào giỏ |
| `/cart` | Trang giỏ hàng: sửa số lượng, chọn địa chỉ, mã giảm giá, đặt hàng |
| `/orders` | Đơn hàng của tôi: thanh toán, huỷ đơn, đánh giá |
| `/account` | Thông tin cá nhân, sổ địa chỉ, đổi mật khẩu |
| `/seller` | Kênh người bán: cửa hàng, đăng bán & khuyến mãi, đơn hàng của shop |
| `/admin` | Quản trị: tổng quan, tài khoản, cửa hàng, danh mục & sản phẩm, đơn hàng, mã giảm giá |

Giỏ hàng nằm trên header ở mọi trang (kèm số lượng), các trang con đều có nút quay lại.

Đổi địa chỉ gateway bằng `NEXT_PUBLIC_API_BASE_URL` trong `frontend/.env.local`.

### Tạo tài khoản admin đầu tiên

Đăng ký một tài khoản bình thường (mặc định là `BUYER`), sau đó cấp quyền trực tiếp trong DB:

```sql
-- db_auth
INSERT INTO account_roles (account_id, role) VALUES (1, 'ADMIN');
```

## 4. Danh sách API

### auth-service — `/api/auth`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | `/register` | công khai | Đăng ký, trả JWT |
| POST | `/login` | công khai | Đăng nhập |
| GET | `/me` | đã đăng nhập | Thông tin token hiện tại |
| PUT | `/me/password` | đã đăng nhập | Đổi mật khẩu |
| GET | `/admin/accounts` | ADMIN | Danh sách tài khoản |
| PUT | `/admin/accounts/{id}/roles` | ADMIN | Đặt lại quyền |
| PUT | `/admin/accounts/{id}/status` | ADMIN | Khoá/mở khoá |
| PATCH | `/admin/accounts/{id}/seller-role` | ADMIN | Cấp quyền SELLER (store-service gọi) |
| GET | `/admin/statistics` | ADMIN | Thống kê tài khoản |

### user-service — `/api/users`
| Method | Path | Quyền |
|---|---|---|
| GET / PUT | `/me` | đã đăng nhập |
| GET / POST | `/me/addresses` | đã đăng nhập |
| PUT / DELETE | `/me/addresses/{id}` | đã đăng nhập |

### product-service — `/api/products`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/?keyword=&categoryId=&minPrice=&maxPrice=&sort=` | công khai | Tìm kiếm, lọc, sắp xếp |
| GET | `/{id}` | công khai | Chi tiết (kèm giá sau khuyến mãi) |
| GET | `/categories` | công khai | Danh mục |
| GET | `/{id}/promotions` | công khai | Khuyến mãi của sản phẩm |
| POST | `/` | SELLER | Đăng bán |
| GET | `/mine` | SELLER | Sản phẩm của shop |
| PUT | `/{id}` | SELLER | Sửa sản phẩm |
| PUT | `/{id}/visibility?visible=` | SELLER | Ẩn/hiện sản phẩm |
| POST | `/{id}/promotions` | SELLER | Đăng khuyến mãi |
| GET | `/mine/promotions` | SELLER | Khuyến mãi của shop |
| DELETE | `/promotions/{id}` | SELLER | Xoá khuyến mãi |
| POST | `/categories` | ADMIN | Thêm danh mục |
| PUT | `/categories/{id}` | ADMIN | Sửa danh mục |
| GET | `/admin?status=` | ADMIN | Toàn bộ sản phẩm |
| PUT | `/{id}/status?status=` | ADMIN | Ẩn/cho bán lại |
| GET | `/admin/statistics` | ADMIN | Thống kê catalog |
| PUT | `/internal/{id}/reserve?quantity=` | `X-Internal-Key` | Trừ kho |
| PUT | `/internal/{id}/release?quantity=` | `X-Internal-Key` | Hoàn kho |
| PUT | `/internal/store/{storeId}/visibility?visible=` | `X-Internal-Key` | Ẩn/mở toàn bộ sản phẩm của một cửa hàng |

### store-service — `/api/stores`
| Method | Path | Quyền |
|---|---|---|
| GET | `/`, `/{id}` | công khai |
| POST | `/` | BUYER (mở shop) |
| GET / PUT | `/mine` | BUYER, SELLER |
| GET | `/{id}/verification` | SELLER (service khác gọi) |
| GET | `/admin?status=` | ADMIN |
| GET | `/admin/statistics` | ADMIN |
| PUT | `/{id}/status` | ADMIN |

### order-service — `/api/orders`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/cart` | đã đăng nhập | Xem giỏ |
| POST | `/cart/items` | đã đăng nhập | Thêm vào giỏ (`productId`, `quantity`) |
| PUT | `/cart/items/{productId}?quantity=` | đã đăng nhập | Đổi số lượng (0 = xoá) |
| DELETE | `/cart/items/{productId}`, `/cart` | đã đăng nhập | Xoá dòng / xoá giỏ |
| POST | `/checkout` | BUYER | Đặt hàng; trả về danh sách đơn (tách theo cửa hàng) |
| GET | `/mine` | đã đăng nhập | Đơn của tôi |
| PUT | `/{id}/pay` | BUYER | Thanh toán, body `{ "paymentMethod": "COD\|BANK_TRANSFER\|MOMO\|CREDIT_CARD" }` |
| PUT | `/{id}/cancel` | BUYER | Huỷ đơn, hoàn kho |
| POST | `/{id}/reviews` | BUYER | Đánh giá sau khi nhận hàng |
| GET | `/reviews?productId=` | công khai | Đánh giá của sản phẩm |
| GET | `/reviews/summary?productIds=` | công khai | Điểm sao trung bình |
| GET | `/seller` | SELLER | Đơn của shop |
| PUT | `/{id}/status?status=` | SELLER, ADMIN | Chuyển trạng thái |
| GET | `/admin`, `/admin/statistics` | ADMIN | Toàn bộ đơn, thống kê |
| GET | `/vouchers/active` | công khai | Mã giảm giá đang chạy |
| GET / POST | `/vouchers` | ADMIN | Xem / tạo mã |
| DELETE | `/vouchers/{id}` | ADMIN | Xoá mã |

## 5. Hạn chế đã biết

- Chưa có service discovery/config server: địa chỉ service lấy từ biến môi trường.
- Lớp bảo mật JWT bị lặp ở 5 service (chưa tách thành module dùng chung).
- Endpoint `/api/products/internal/**` chỉ được bảo vệ bằng `X-Internal-Key`; nên chặn thêm ở tầng mạng/gateway khi triển khai thật.
- Trừ kho, hoàn kho và bù trừ khi đặt hàng lỗi đều gọi HTTP đồng bộ (best-effort), chưa dùng saga/message queue.
- Khoá tài khoản và đổi quyền chỉ có hiệu lực hoàn toàn khi token cũ hết hạn (8 giờ) vì quyền nằm
  trong JWT; muốn thu hồi tức thì cần danh sách token bị chặn hoặc gateway gọi introspect.
- Chưa giới hạn số lần đăng nhập sai (hệ thống thật cần chặn dò mật khẩu).
- Chưa phân trang cho danh sách sản phẩm, đơn hàng và tài khoản.
- Giá trong giỏ hàng là giá lúc thêm vào giỏ; giá chốt đơn được tính lại khi đặt hàng nên hai
  con số có thể lệch nhau nếu người bán vừa đổi giá.
- Bấm đặt hàng hai lần liên tiếp có thể tạo hai đơn.
- Người mua vẫn tự bấm xác nhận đã thanh toán đơn COD (mô phỏng, chưa nối cổng thanh toán thật).
- Mỗi cửa hàng chỉ có một đơn hàng gộp: đơn nhiều shop chưa được tách theo shop.
- Chưa có unit/integration test (chỉ có test `contextLoads` mặc định).
