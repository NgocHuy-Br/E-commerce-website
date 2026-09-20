# Test case — user-service

## 1. Thông tin chung

| Hạng mục | Nội dung |
|---|---|
| Service | user-service, cổng 8082 |
| Gọi qua gateway | `http://localhost:8080/api/users` |
| Cơ sở dữ liệu | MySQL `db_user` (cổng 3311), bảng `user_profiles`, `addresses` |
| Chức năng phụ trách | Thông tin cá nhân và sổ địa chỉ giao hàng |
| Lưu ý | Hồ sơ được tạo tự động lần đầu người dùng gọi API, không cần đăng ký riêng |

## 2. Test case API

| Mã | Mục đích | Phương thức & đường dẫn | Dữ liệu / điều kiện | Kết quả mong đợi | HTTP | Ưu tiên | Tự động hoá |
|---|---|---|---|---|---|---|---|
| USER-01 | Xem hồ sơ lần đầu thì hệ thống tự tạo | `GET /me` | tài khoản mới đăng ký, chưa có hồ sơ | Trả về userId, email; các trường tên/SĐT còn trống | 200 | Cao | Unit: UserServiceApplicationTests |
| USER-02 | Xem hồ sơ khi đã có dữ liệu | `GET /me` | tài khoản đã cập nhật hồ sơ | Trả đúng họ tên, SĐT, ảnh đã lưu | 200 | Cao | API |
| USER-03 | Không có token thì bị chặn | `GET /me` | không gửi Authorization | Bị từ chối | 401 | Cao | API |
| USER-04 | Cập nhật hồ sơ thành công | `PUT /me` | fullName = `Nguyễn Văn Mua`, phoneNumber = `0987654321` | Lưu đúng dữ liệu, gọi lại `GET /me` thấy dữ liệu mới | 200 | Cao | Unit: UserProfileServiceTest |
| USER-05 | Họ tên có số thì bị chặn | `PUT /me` | fullName = `Nguyen Van 123` | fieldErrors.fullName = "Họ tên chỉ gồm chữ và dấu cách..." | 400 | Trung bình | Unit: AddressRequestValidationTest (cùng quy tắc) |
| USER-06 | Số điện thoại có chữ thì bị chặn | `PUT /me` | phoneNumber = `09abc` | fieldErrors.phoneNumber = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0" | 400 | Trung bình | API |
| USER-07 | Số điện thoại thiếu số thì bị chặn | `PUT /me` | phoneNumber = `0912` | Báo lỗi như USER-06 | 400 | Trung bình | API |
| USER-08 | Ảnh đại diện không phải đường dẫn http | `PUT /me` | avatarUrl = `abc.png` | "Ảnh đại diện phải là đường dẫn bắt đầu bằng http:// hoặc https://" | 400 | Thấp | API |
| USER-09 | Bỏ trống các trường không bắt buộc | `PUT /me` | fullName, phoneNumber, avatarUrl đều rỗng hoặc null | Lưu thành công, không báo lỗi | 200 | Thấp | API |
| USER-10 | Xem sổ địa chỉ | `GET /me/addresses` | đã có 2 địa chỉ | Danh sách có địa chỉ mặc định đứng trước | 200 | Cao | API |
| USER-11 | Thêm địa chỉ mới | `POST /me/addresses` | đầy đủ người nhận, SĐT, số nhà, phường, quận, tỉnh | Tạo thành công, trả về id | 201 | Cao | Unit: UserProfileServiceTest |
| USER-12 | Địa chỉ có ngoặc đơn và dấu cộng | `POST /me/addresses` | detail = `Km 9+200 (cạnh Vincom)` | Tạo thành công (đây là dữ liệu thật hay gặp) | 201 | Trung bình | Unit: AddressRequestValidationTest |
| USER-13 | Địa chỉ chứa ký tự lạ | `POST /me/addresses` | detail = `Số 5 <script>` | "Số nhà và tên đường chứa ký tự không được phép" | 400 | Trung bình | Unit: AddressRequestValidationTest |
| USER-14 | Tên người nhận có số | `POST /me/addresses` | recipientName = `Nguyen Van 123` | "Tên người nhận chỉ gồm chữ và dấu cách..." | 400 | Trung bình | Unit: AddressRequestValidationTest |
| USER-15 | Thiếu trường bắt buộc | `POST /me/addresses` | để trống phường/xã | fieldErrors.ward = "Phường/xã không được để trống" | 400 | Trung bình | API |
| USER-16 | Đặt địa chỉ mới làm mặc định | `POST /me/addresses` | defaultAddress = true, đã có địa chỉ mặc định cũ | Địa chỉ mới là mặc định, địa chỉ cũ bị bỏ mặc định | 201 | Cao | Unit: UserProfileServiceTest |
| USER-17 | Thêm địa chỉ không đặt mặc định | `POST /me/addresses` | defaultAddress = false | Địa chỉ mặc định cũ không thay đổi | 201 | Trung bình | Unit: UserProfileServiceTest |
| USER-18 | Sửa địa chỉ của mình | `PUT /me/addresses/{id}` | id thuộc về mình | Cập nhật thành công | 200 | Cao | API |
| USER-19 | Sửa địa chỉ của người khác | `PUT /me/addresses/{id}` | id thuộc tài khoản khác | "Không tìm thấy địa chỉ" | 404 | Cao | Unit: UserProfileServiceTest |
| USER-20 | Xoá địa chỉ | `DELETE /me/addresses/{id}` | id thuộc về mình / của người khác | Của mình: xoá được (204). Của người khác: 404 | 204 / 404 | Cao | Unit: UserProfileServiceTest |

## 3. Test case giao diện (kiểm thử thủ công)

| Mã | Màn hình | Thao tác | Kết quả mong đợi |
|---|---|---|---|
| USER-UI-01 | `/account` | Nhập chữ vào ô Số điện thoại | Chữ không hiện ra (ô chỉ nhận số) |
| USER-UI-02 | `/account` | Nhập họ tên có số rồi bấm Lưu | Ô viền đỏ, hiện chữ đỏ, không gọi API |
| USER-UI-03 | `/account` | Lưu thông tin đúng | Thông báo xanh "Đã cập nhật thông tin cá nhân", tự tắt sau 3 giây |
| USER-UI-04 | `/account` | Thêm địa chỉ rồi tick "Đặt làm địa chỉ mặc định" | Địa chỉ mới có nhãn "Mặc định", địa chỉ cũ mất nhãn |
| USER-UI-05 | `/account` | Bấm Sửa một địa chỉ | Form được điền sẵn dữ liệu, nút đổi thành "Cập nhật địa chỉ" |
| USER-UI-06 | `/cart` | Mở trang giỏ hàng sau khi đã có địa chỉ | Ô địa chỉ giao hàng chọn sẵn địa chỉ mặc định |
| USER-UI-07 | `/account` | Xoá địa chỉ đang dùng làm mặc định | Xoá được, danh sách cập nhật ngay |

## 4. Gợi ý khi tự động hoá

```bash
GW=http://localhost:8080
TOKEN=... # token của buyer

# USER-04
curl -s -X PUT $GW/api/users/me -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Nguyễn Văn Mua","phoneNumber":"0987654321","avatarUrl":null}' | jq

# USER-13 (mong đợi 400 kèm fieldErrors)
curl -s -X POST $GW/api/users/me/addresses -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"recipientName":"Nguyễn Văn Mua","phoneNumber":"0987654321","detail":"Số 5 <script>","ward":"P1","district":"Q1","city":"Hà Nội","defaultAddress":false}' | jq
```

Sau khi chạy nhóm test case này nên xoá các địa chỉ vừa tạo để dữ liệu demo không bị rác.
