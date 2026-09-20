# Test case — auth-service

| Hạng mục | Nội dung |
|---|---|
| Service | auth-service, cổng 8081 |
| Gọi qua gateway | `http://localhost:8080/api/auth` |
| Cơ sở dữ liệu | MySQL `db_auth` (3310): bảng `accounts`, `account_roles` |
| Chức năng | Đăng ký, đăng nhập, đổi mật khẩu, phân quyền, khoá tài khoản, cấp JWT |

Mỗi test case gồm: **Scenario** (các bước) → **Dữ liệu vào** (request cụ thể) → **Kết quả mong đợi**.

---

## A. Đăng ký

**AUTH-01 · Đăng ký tài khoản mới thành công** — Ưu tiên: Cao · Tự động hoá: API
- **Scenario**: khách chưa có tài khoản gửi yêu cầu đăng ký với email chưa tồn tại
- **Dữ liệu vào**: `POST /api/auth/register` (không cần token)
  ```json
  {"email": "tc01@test.vn", "password": "matkhau123"}
  ```
- **Kết quả mong đợi**: HTTP `201` · body có `accessToken` (chuỗi JWT), `tokenType` = `Bearer`, `userId` là số, `email` = `tc01@test.vn`, `roles` = `["BUYER"]` · bảng `accounts` có thêm 1 dòng, `account_roles` có 1 dòng role = BUYER

**AUTH-02 · Đăng ký trùng email** — Ưu tiên: Cao · Tự động hoá: Unit `AuthServiceTest`
- **Scenario**: gửi đăng ký với email đã tồn tại trong hệ thống
- **Dữ liệu vào**: `POST /api/auth/register`
  ```json
  {"email": "buyer@nhom14.vn", "password": "matkhau123"}
  ```
- **Kết quả mong đợi**: HTTP `409` · `message` = `Email này đã được đăng ký` · không tạo dòng mới trong `accounts`

**AUTH-03 · Email sai định dạng** — Ưu tiên: Trung bình · Tự động hoá: Unit `RegisterRequestValidationTest`
- **Scenario**: nhập email không có ký tự `@`
- **Dữ liệu vào**: `POST /api/auth/register`
  ```json
  {"email": "khong-phai-email", "password": "matkhau123"}
  ```
- **Kết quả mong đợi**: HTTP `400` · `message` = `Dữ liệu không hợp lệ` · `fieldErrors.email` = `Email không đúng định dạng`

**AUTH-04 · Mật khẩu ngắn hơn 6 ký tự** — Ưu tiên: Trung bình · Tự động hoá: Unit `RegisterRequestValidationTest`
- **Scenario**: nhập mật khẩu chỉ 3 ký tự
- **Dữ liệu vào**: `POST /api/auth/register`
  ```json
  {"email": "tc04@test.vn", "password": "123"}
  ```
- **Kết quả mong đợi**: HTTP `400` · `fieldErrors.password` = `Mật khẩu phải từ 6 đến 72 ký tự`

**AUTH-05 · Email có khoảng trắng đầu/cuối** — Ưu tiên: Trung bình · Tự động hoá: Unit `RegisterRequestValidationTest`
- **Scenario**: người dùng dán email từ nơi khác nên có khoảng trắng, hệ thống phải tự cắt
- **Dữ liệu vào**: `POST /api/auth/login`
  ```json
  {"email": "  buyer@nhom14.vn  ", "password": "buyer123"}
  ```
- **Kết quả mong đợi**: HTTP `200` · `email` trả về = `buyer@nhom14.vn` (đã cắt khoảng trắng)

## B. Đăng nhập

**AUTH-06 · Đăng nhập đúng** — Ưu tiên: Cao · Tự động hoá: API
- **Scenario**: người mua đăng nhập bằng email và mật khẩu đúng
- **Dữ liệu vào**: `POST /api/auth/login`
  ```json
  {"email": "buyer@nhom14.vn", "password": "buyer123"}
  ```
- **Kết quả mong đợi**: HTTP `200` · `userId` = `3` · `email` = `buyer@nhom14.vn` · `roles` chứa `BUYER` · `accessToken` giải mã được và có hạn 8 giờ

**AUTH-07 · Sai mật khẩu** — Ưu tiên: Cao · Tự động hoá: Unit `AuthServiceApplicationTests`
- **Scenario**: nhập đúng email nhưng sai mật khẩu
- **Dữ liệu vào**: `POST /api/auth/login`
  ```json
  {"email": "buyer@nhom14.vn", "password": "sai-mat-khau"}
  ```
- **Kết quả mong đợi**: HTTP `401` · `message` = `Email hoặc mật khẩu không đúng` · không trả accessToken

**AUTH-08 · Email không tồn tại** — Ưu tiên: Trung bình · Tự động hoá: API
- **Scenario**: đăng nhập bằng email chưa đăng ký; thông báo phải giống AUTH-07 để không tiết lộ email nào đã tồn tại
- **Dữ liệu vào**: `POST /api/auth/login`
  ```json
  {"email": "khongtontai@test.vn", "password": "matkhau123"}
  ```
- **Kết quả mong đợi**: HTTP `401` · `message` = `Email hoặc mật khẩu không đúng`

**AUTH-09 · Tài khoản bị khoá** — Ưu tiên: Cao · Tự động hoá: Unit `AuthServiceTest`
- **Scenario**: 1) Admin khoá tài khoản buyer. 2) Buyer thử đăng nhập bằng mật khẩu đúng
- **Dữ liệu vào**:
  1. `PUT /api/auth/admin/accounts/3/status` (token admin) · body `{"status": "LOCKED"}`
  2. `POST /api/auth/login` · body `{"email": "buyer@nhom14.vn", "password": "buyer123"}`
- **Kết quả mong đợi**: bước 2 trả HTTP `403` · `message` = `Tài khoản đã bị khoá, vui lòng liên hệ quản trị viên`
- **Dọn dữ liệu**: đặt lại `{"status": "ACTIVE"}`

## C. Thông tin tài khoản và token

**AUTH-10 · Xem tài khoản hiện tại** — Ưu tiên: Cao · Tự động hoá: API
- **Scenario**: sau khi đăng nhập, gọi API xem mình là ai
- **Dữ liệu vào**: `GET /api/auth/me` · header `Authorization: Bearer <token của buyer>`
- **Kết quả mong đợi**: HTTP `200` · body `{"userId": 3, "email": "buyer@nhom14.vn", "roles": [...]}`

**AUTH-11 · Không gửi token** — Ưu tiên: Cao · Tự động hoá: API
- **Scenario**: gọi API cần đăng nhập nhưng không có header Authorization
- **Dữ liệu vào**: `GET /api/auth/me` (không header)
- **Kết quả mong đợi**: HTTP `401` (không phải 403)

**AUTH-12 · Token sai hoặc hết hạn** — Ưu tiên: Cao · Tự động hoá: API + Manual
- **Scenario**: gửi token rác (giống tình huống token hết hạn sau 8 giờ)
- **Dữ liệu vào**: `GET /api/auth/me` · header `Authorization: Bearer token-rac-khong-hop-le`
- **Kết quả mong đợi**: HTTP `401` · trên giao diện: phiên bị xoá, header quay về nút "Đăng nhập", hiện thông báo `Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.`

## D. Đổi mật khẩu

**AUTH-13 · Đổi mật khẩu thành công** — Ưu tiên: Cao · Tự động hoá: Unit `AuthServiceTest`
- **Scenario**: 1) Đổi mật khẩu với mật khẩu hiện tại đúng. 2) Đăng nhập lại bằng mật khẩu mới
- **Dữ liệu vào**:
  1. `PUT /api/auth/me/password` (token buyer)
     ```json
     {"currentPassword": "buyer123", "newPassword": "buyer456"}
     ```
  2. `POST /api/auth/login` · body `{"email": "buyer@nhom14.vn", "password": "buyer456"}`
- **Kết quả mong đợi**: bước 1 trả HTTP `204` không có body · bước 2 trả HTTP `200`
- **Dọn dữ liệu**: đổi lại về `buyer123`

**AUTH-14 · Sai mật khẩu hiện tại** — Ưu tiên: Cao · Tự động hoá: Unit `AuthServiceTest`
- **Scenario**: đổi mật khẩu nhưng nhập sai mật khẩu đang dùng
- **Dữ liệu vào**: `PUT /api/auth/me/password` (token buyer)
  ```json
  {"currentPassword": "sai-mat-khau", "newPassword": "matkhaumoi"}
  ```
- **Kết quả mong đợi**: HTTP `400` · `message` = `Mật khẩu hiện tại không đúng` · mật khẩu cũ vẫn dùng được

**AUTH-15 · Mật khẩu mới trùng mật khẩu cũ** — Ưu tiên: Trung bình · Tự động hoá: Unit `AuthServiceTest`
- **Scenario**: nhập mật khẩu mới giống mật khẩu hiện tại
- **Dữ liệu vào**: `PUT /api/auth/me/password` (token buyer)
  ```json
  {"currentPassword": "buyer123", "newPassword": "buyer123"}
  ```
- **Kết quả mong đợi**: HTTP `400` · `message` = `Mật khẩu mới phải khác mật khẩu hiện tại`

**AUTH-16 · Mật khẩu mới quá ngắn** — Ưu tiên: Trung bình · Tự động hoá: API
- **Scenario**: nhập mật khẩu mới chỉ 3 ký tự
- **Dữ liệu vào**: `PUT /api/auth/me/password` (token buyer)
  ```json
  {"currentPassword": "buyer123", "newPassword": "123"}
  ```
- **Kết quả mong đợi**: HTTP `400` · `fieldErrors.newPassword` = `Mật khẩu mới phải từ 6 đến 72 ký tự`

## E. Chức năng quản trị viên

**AUTH-17 · Admin xem danh sách tài khoản** — Ưu tiên: Cao · Tự động hoá: API
- **Scenario**: quản trị viên mở danh sách tài khoản toàn hệ thống
- **Dữ liệu vào**: `GET /api/auth/admin/accounts` · token admin
- **Kết quả mong đợi**: HTTP `200` · mảng các phần tử `{id, email, roles, status}` · có đủ 4 tài khoản mẫu · tài khoản admin có `roles` = `["ADMIN"]`

**AUTH-18 · Người mua gọi API quản trị** — Ưu tiên: Cao · Tự động hoá: API
- **Scenario**: người mua dùng Postman gọi trực tiếp API dành cho admin
- **Dữ liệu vào**: `GET /api/auth/admin/accounts` · token buyer
- **Kết quả mong đợi**: HTTP `403` · `message` = `Tài khoản của bạn không có quyền dùng chức năng này`

**AUTH-19 · Cấp quyền người bán** — Ưu tiên: Cao · Tự động hoá: Unit `AuthServiceRoleTest`
- **Scenario**: admin cấp thêm quyền SELLER cho một tài khoản khách
- **Dữ liệu vào**: `PUT /api/auth/admin/accounts/3/roles` · token admin
  ```json
  {"roles": ["BUYER", "SELLER"]}
  ```
- **Kết quả mong đợi**: HTTP `200` · `roles` trả về chứa cả `BUYER` và `SELLER` · người dùng phải đăng nhập lại mới dùng được quyền mới

**AUTH-20 · Quyền ADMIN loại trừ mua và bán** — Ưu tiên: Cao · Tự động hoá: Unit `AuthServiceRoleTest`
- **Scenario**: admin gửi lên cả ba quyền, hệ thống phải tự bỏ quyền khách
- **Dữ liệu vào**: `PUT /api/auth/admin/accounts/1/roles` · token admin
  ```json
  {"roles": ["ADMIN", "BUYER", "SELLER"]}
  ```
- **Kết quả mong đợi**: HTTP `200` · `roles` = `["ADMIN"]` (chỉ một quyền)

**AUTH-21 · Gửi tên quyền không tồn tại** — Ưu tiên: Thấp · Tự động hoá: API
- **Scenario**: gửi một giá trị quyền không có trong hệ thống
- **Dữ liệu vào**: `PUT /api/auth/admin/accounts/3/roles` · token admin
  ```json
  {"roles": ["SUPERMAN"]}
  ```
- **Kết quả mong đợi**: HTTP `400` · `message` = `Dữ liệu gửi lên không đúng định dạng` (không phải 500)

**AUTH-22 · Khoá và mở khoá tài khoản** — Ưu tiên: Cao · Tự động hoá: API
- **Scenario**: 1) Admin khoá tài khoản. 2) Kiểm tra trạng thái. 3) Mở khoá lại
- **Dữ liệu vào**:
  1. `PUT /api/auth/admin/accounts/3/status` · body `{"status": "LOCKED"}`
  2. `GET /api/auth/admin/accounts`
  3. `PUT /api/auth/admin/accounts/3/status` · body `{"status": "ACTIVE"}`
- **Kết quả mong đợi**: bước 1 và 3 trả HTTP `200` với `status` tương ứng · bước 2 thấy tài khoản id 3 có `status` = `LOCKED` · khi đang LOCKED thì AUTH-09 xảy ra

**AUTH-23 · Không cấp quyền bán cho tài khoản quản trị** — Ưu tiên: Trung bình · Tự động hoá: Unit `AuthServiceRoleTest`
- **Scenario**: gọi API cấp quyền người bán cho chính tài khoản admin
- **Dữ liệu vào**: `PATCH /api/auth/admin/accounts/1/seller-role` · token admin (không có body)
- **Kết quả mong đợi**: HTTP `400` · `message` = `Tài khoản quản trị viên không thể trở thành người bán`

**AUTH-24 · Thống kê tài khoản** — Ưu tiên: Trung bình · Tự động hoá: Unit `AuthServiceTest`
- **Scenario**: admin mở trang tổng quan để xem số liệu tài khoản
- **Dữ liệu vào**: `GET /api/auth/admin/statistics` · token admin
- **Kết quả mong đợi**: HTTP `200` · body có `totalAccounts`, `activeAccounts`, `lockedAccounts`, `buyers`, `sellers`, `admins` · `totalAccounts` = `activeAccounts + lockedAccounts` · `admins` = 1 với dữ liệu mẫu

---

## F. Test case giao diện (kiểm thử thủ công)

**AUTH-UI-01 · Bỏ trống ô đăng nhập**
- **Scenario**: mở `/login`, không nhập gì, bấm nút Đăng nhập
- **Dữ liệu vào**: email = rỗng, mật khẩu = rỗng
- **Kết quả mong đợi**: dưới ô email hiện chữ đỏ `Email không được để trống`, dưới ô mật khẩu hiện `Mật khẩu không được để trống`; không có request nào gửi đi (kiểm tra tab Network)

**AUTH-UI-02 · Email sai định dạng**
- **Scenario**: mở `/login`, nhập email thiếu `@`, bấm Đăng nhập
- **Dữ liệu vào**: email = `abc`, mật khẩu = `matkhau123`
- **Kết quả mong đợi**: ô email viền đỏ, hiện `Email không đúng định dạng`, không gọi API

**AUTH-UI-03 · Đăng nhập rồi quay lại trang trước**
- **Scenario**: đang ở `/cart` khi chưa đăng nhập → bấm Đăng nhập trên header → đăng nhập đúng
- **Dữ liệu vào**: buyer@nhom14.vn / buyer123
- **Kết quả mong đợi**: sau khi đăng nhập quay lại đúng `/cart`; header hiện email và nút Giỏ hàng kèm số lượng

**AUTH-UI-04 · Đăng nhập bằng tài khoản quản trị**
- **Scenario**: mở `/login`, đăng nhập bằng tài khoản admin
- **Dữ liệu vào**: admin@nhom14.vn / admin123
- **Kết quả mong đợi**: chuyển thẳng tới `/admin`; header **không** có nút Giỏ hàng, không có mục Đơn hàng của tôi và Kênh người bán; cạnh email hiện chữ `· Quản trị viên`

**AUTH-UI-05 · Đăng xuất**
- **Scenario**: đang đăng nhập, bấm Đăng xuất trên header
- **Dữ liệu vào**: không
- **Kết quả mong đợi**: về trang chủ; header hiện lại nút Đăng nhập; số trên giỏ hàng về 0; tải lại trang vẫn ở trạng thái chưa đăng nhập

**AUTH-UI-06 · Đổi mật khẩu sai mật khẩu hiện tại**
- **Scenario**: mở `/account`, mục Đổi mật khẩu, nhập sai mật khẩu hiện tại rồi bấm Lưu
- **Dữ liệu vào**: mật khẩu hiện tại = `sai`, mật khẩu mới = `matkhaumoi`
- **Kết quả mong đợi**: banner đỏ giữa trên hiện `Mật khẩu hiện tại không đúng`, tự tắt sau khoảng 6 giây

**AUTH-UI-07 · Cấp quyền trên giao diện quản trị**
- **Scenario**: đăng nhập admin → `/admin` tab Tài khoản → bấm `Cấp SELLER` ở một tài khoản
- **Dữ liệu vào**: tài khoản buyer@nhom14.vn
- **Kết quả mong đợi**: thông báo xanh `Đã cập nhật quyền của buyer@nhom14.vn`; nhãn quyền của dòng đó có thêm `SELLER`

**AUTH-UI-08 · Quyền mới chỉ có hiệu lực sau khi đăng nhập lại**
- **Scenario**: 1) Admin cấp quyền SELLER cho một tài khoản. 2) Tài khoản đó (đang đăng nhập ở tab khác) tải lại trang. 3) Tài khoản đó đăng xuất rồi đăng nhập lại
- **Dữ liệu vào**: tài khoản vừa được cấp quyền
- **Kết quả mong đợi**: bước 2 vẫn chưa thấy quyền mới (vì quyền nằm trong JWT cũ); bước 3 mới thấy mục Kênh người bán hoạt động đầy đủ

---

## G. Lệnh mẫu để tự động hoá

```bash
GW=http://localhost:8080

# AUTH-01
curl -s -X POST $GW/api/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"tc01@test.vn","password":"matkhau123"}' | jq

# AUTH-07: mong đợi 401
curl -s -w "\nHTTP %{http_code}\n" -X POST $GW/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"buyer@nhom14.vn","password":"sai-mat-khau"}'

# Lấy token để dùng cho các test case sau
ADMIN=$(curl -s -X POST $GW/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@nhom14.vn","password":"admin123"}' | jq -r .accessToken)

# AUTH-18: mong đợi 403
curl -s -w "\nHTTP %{http_code}\n" $GW/api/auth/admin/accounts \
  -H "Authorization: Bearer $BUYER"
```

**Cần dọn dữ liệu sau khi chạy**: AUTH-01 (xoá tài khoản vừa tạo), AUTH-09 và AUTH-22 (mở khoá lại),
AUTH-13 (đổi mật khẩu về `buyer123`), AUTH-19/AUTH-20 (trả quyền về như bảng dữ liệu mẫu).
