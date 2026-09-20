# Test case — auth-service

## 1. Thông tin chung

| Hạng mục | Nội dung |
|---|---|
| Service | auth-service, cổng 8081 |
| Gọi qua gateway | `http://localhost:8080/api/auth` |
| Cơ sở dữ liệu | MySQL `db_auth` (cổng 3310), bảng `accounts`, `account_roles` |
| Chức năng phụ trách | Đăng ký, đăng nhập, đổi mật khẩu, phân quyền, khoá tài khoản, cấp JWT |

## 2. Test case API

| Mã | Mục đích | Phương thức & đường dẫn | Dữ liệu / điều kiện | Kết quả mong đợi | HTTP | Ưu tiên | Tự động hoá |
|---|---|---|---|---|---|---|---|
| AUTH-01 | Đăng ký tài khoản mới | `POST /register` | email chưa tồn tại, mật khẩu ≥ 6 ký tự | Trả về accessToken, roles = `["BUYER"]` | 201 | Cao | API, Unit: AuthServiceApplicationTests |
| AUTH-02 | Không cho đăng ký trùng email | `POST /register` | email đã tồn tại | Thông báo "Email này đã được đăng ký" | 409 | Cao | Unit: AuthServiceTest |
| AUTH-03 | Chặn email sai định dạng | `POST /register` | email = `khong-phai-email` | fieldErrors.email = "Email không đúng định dạng" | 400 | Trung bình | Unit: RegisterRequestValidationTest |
| AUTH-04 | Chặn mật khẩu ngắn | `POST /register` | password = `123` | fieldErrors.password = "Mật khẩu phải từ 6 đến 72 ký tự" | 400 | Trung bình | Unit: RegisterRequestValidationTest |
| AUTH-05 | Email có khoảng trắng vẫn dùng được | `POST /login` | email = `"  buyer@nhom14.vn  "` | Đăng nhập thành công | 200 | Trung bình | Unit: RegisterRequestValidationTest |
| AUTH-06 | Đăng nhập đúng | `POST /login` | buyer@nhom14.vn / buyer123 | Trả accessToken, userId, email, roles | 200 | Cao | API |
| AUTH-07 | Đăng nhập sai mật khẩu | `POST /login` | mật khẩu sai | "Email hoặc mật khẩu không đúng" | 401 | Cao | Unit: AuthServiceApplicationTests |
| AUTH-08 | Đăng nhập email không tồn tại | `POST /login` | email lạ | "Email hoặc mật khẩu không đúng" (không tiết lộ email có tồn tại hay không) | 401 | Trung bình | API |
| AUTH-09 | Tài khoản bị khoá không đăng nhập được | `POST /login` | tài khoản đã bị admin khoá | "Tài khoản đã bị khoá, vui lòng liên hệ quản trị viên" | 403 | Cao | Unit: AuthServiceTest |
| AUTH-10 | Xem thông tin tài khoản hiện tại | `GET /me` | có token hợp lệ | Trả userId, email, roles | 200 | Cao | API |
| AUTH-11 | Không có token thì bị chặn | `GET /me` | không gửi header Authorization | Bị từ chối | 401 | Cao | API |
| AUTH-12 | Token sai hoặc hết hạn thì bị chặn | `GET /me` | Authorization = `Bearer token-rac` | Bị từ chối, frontend tự đăng xuất | 401 | Cao | API, Manual |
| AUTH-13 | Đổi mật khẩu thành công | `PUT /me/password` | currentPassword đúng, newPassword khác | Không trả nội dung; đăng nhập được bằng mật khẩu mới | 204 | Cao | Unit: AuthServiceTest |
| AUTH-14 | Sai mật khẩu hiện tại | `PUT /me/password` | currentPassword sai | "Mật khẩu hiện tại không đúng" | 400 | Cao | Unit: AuthServiceTest |
| AUTH-15 | Mật khẩu mới trùng mật khẩu cũ | `PUT /me/password` | newPassword = currentPassword | "Mật khẩu mới phải khác mật khẩu hiện tại" | 400 | Trung bình | Unit: AuthServiceTest |
| AUTH-16 | Mật khẩu mới quá ngắn | `PUT /me/password` | newPassword = `123` | fieldErrors.newPassword | 400 | Trung bình | API |
| AUTH-17 | Admin xem danh sách tài khoản | `GET /admin/accounts` | token admin | Danh sách id, email, roles, status | 200 | Cao | API |
| AUTH-18 | Người mua không xem được danh sách tài khoản | `GET /admin/accounts` | token buyer | "Tài khoản của bạn không có quyền dùng chức năng này" | 403 | Cao | API |
| AUTH-19 | Cấp quyền người bán | `PUT /admin/accounts/{id}/roles` | roles = `["BUYER","SELLER"]` | Tài khoản có 2 quyền | 200 | Cao | Unit: AuthServiceRoleTest |
| AUTH-20 | Quyền ADMIN loại trừ mua và bán | `PUT /admin/accounts/{id}/roles` | roles = `["ADMIN","BUYER","SELLER"]` | Kết quả chỉ còn `["ADMIN"]` | 200 | Cao | Unit: AuthServiceRoleTest |
| AUTH-21 | Gửi quyền không tồn tại | `PUT /admin/accounts/{id}/roles` | roles = `["SUPERMAN"]` | "Dữ liệu gửi lên không đúng định dạng" | 400 | Thấp | API |
| AUTH-22 | Khoá và mở khoá tài khoản | `PUT /admin/accounts/{id}/status` | status = `LOCKED` rồi `ACTIVE` | Trạng thái đổi đúng; khi LOCKED thì AUTH-09 xảy ra | 200 | Cao | API |
| AUTH-23 | Không cấp quyền bán cho tài khoản quản trị | `PATCH /admin/accounts/{id}/seller-role` | id của tài khoản ADMIN | "Tài khoản quản trị viên không thể trở thành người bán" | 400 | Trung bình | Unit: AuthServiceRoleTest |
| AUTH-24 | Thống kê tài khoản | `GET /admin/statistics` | token admin | totalAccounts, activeAccounts, lockedAccounts, buyers, sellers, admins đúng số thực tế | 200 | Trung bình | Unit: AuthServiceTest |

## 3. Test case giao diện (kiểm thử thủ công)

| Mã | Màn hình | Thao tác | Kết quả mong đợi |
|---|---|---|---|
| AUTH-UI-01 | `/login` | Bấm Đăng nhập khi để trống ô | Hiện chữ đỏ dưới ô: "Email không được để trống", "Mật khẩu không được để trống" |
| AUTH-UI-02 | `/login` | Nhập email `abc`, bấm Đăng nhập | Ô email viền đỏ, hiện "Email không đúng định dạng", không gọi API |
| AUTH-UI-03 | `/login` | Đăng nhập đúng từ trang `/cart` | Quay lại `/cart`, header hiện email và giỏ hàng |
| AUTH-UI-04 | `/login` | Đăng nhập bằng tài khoản admin | Vào thẳng `/admin`, header không có giỏ hàng và đơn hàng |
| AUTH-UI-05 | Header | Bấm Đăng xuất | Về trang chủ, header hiện lại nút Đăng nhập, giỏ hàng về 0 |
| AUTH-UI-06 | `/account` | Đổi mật khẩu với mật khẩu hiện tại sai | Thông báo đỏ "Mật khẩu hiện tại không đúng", tự tắt sau vài giây |
| AUTH-UI-07 | `/admin` tab Tài khoản | Cấp quyền SELLER cho một tài khoản | Nhãn quyền của tài khoản đó cập nhật ngay sau khi làm mới |
| AUTH-UI-08 | Sau khi admin đổi quyền | Người dùng đó tải lại trang | Quyền cũ vẫn còn cho tới khi đăng xuất rồi đăng nhập lại (vì quyền nằm trong token) |

## 4. Gợi ý khi tự động hoá

```bash
GW=http://localhost:8080

# AUTH-01
curl -s -X POST $GW/api/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"tc01@test.vn","password":"matkhau123"}' | jq

# AUTH-07 (mong đợi 401)
curl -s -o /dev/null -w "%{http_code}\n" -X POST $GW/api/auth/login \
  -H 'Content-Type: application/json' -d '{"email":"buyer@nhom14.vn","password":"sai"}'
```

Lưu ý thứ tự phụ thuộc: AUTH-22 khoá tài khoản nên phải **mở khoá lại** trước khi chạy các test case khác,
và AUTH-13 đổi mật khẩu nên phải đổi về mật khẩu gốc sau khi test.
