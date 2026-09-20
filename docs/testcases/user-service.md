# Test case — user-service

| Hạng mục | Nội dung |
|---|---|
| Service | user-service, cổng 8082 |
| Gọi qua gateway | `http://localhost:8080/api/users` |
| Cơ sở dữ liệu | MySQL `db_user` (3311): bảng `user_profiles`, `addresses` |
| Chức năng | Thông tin cá nhân và sổ địa chỉ giao hàng |
| Lưu ý | Hồ sơ tự tạo lần đầu người dùng gọi API, không cần bước khởi tạo riêng |

Mỗi test case gồm: **Scenario** (các bước) → **Dữ liệu vào** (request cụ thể) → **Kết quả mong đợi**.

---

## A. Thông tin cá nhân

**USER-01 · Xem hồ sơ lần đầu, hệ thống tự tạo** — Ưu tiên: Cao · Tự động hoá: Unit `UserServiceApplicationTests`
- **Scenario**: 1) Đăng ký tài khoản mới. 2) Dùng token vừa nhận để gọi API xem hồ sơ (chưa từng cập nhật gì)
- **Dữ liệu vào**: `GET /api/users/me` · token của tài khoản mới
- **Kết quả mong đợi**: HTTP `200` · `userId` đúng của tài khoản, `email` đúng, `fullName` = `null`, `phoneNumber` = `null`, `avatarUrl` = `null` · bảng `user_profiles` có thêm 1 dòng

**USER-02 · Xem hồ sơ đã có dữ liệu** — Ưu tiên: Cao · Tự động hoá: API
- **Scenario**: người mua đã cập nhật hồ sơ trước đó, mở lại trang tài khoản
- **Dữ liệu vào**: `GET /api/users/me` · token buyer
- **Kết quả mong đợi**: HTTP `200` · `userId` = `3`, `email` = `buyer@nhom14.vn`, `fullName` và `phoneNumber` đúng giá trị đã lưu

**USER-03 · Không gửi token** — Ưu tiên: Cao · Tự động hoá: API
- **Scenario**: gọi API hồ sơ mà không đăng nhập
- **Dữ liệu vào**: `GET /api/users/me` (không header Authorization)
- **Kết quả mong đợi**: HTTP `401`

**USER-04 · Cập nhật hồ sơ thành công** — Ưu tiên: Cao · Tự động hoá: Unit `UserProfileServiceTest`
- **Scenario**: người mua sửa họ tên và số điện thoại rồi lưu
- **Dữ liệu vào**: `PUT /api/users/me` · token buyer · `{"fullName": "Nguyễn Văn Mua", "phoneNumber": "0987654321", "avatarUrl": null}`
- **Kết quả mong đợi**: HTTP `200` · body trả `fullName` = `Nguyễn Văn Mua`, `phoneNumber` = `0987654321` · gọi lại `GET /api/users/me` thấy đúng dữ liệu mới

**USER-05 · Họ tên có chữ số** — Ưu tiên: Trung bình · Tự động hoá: API
- **Scenario**: nhập họ tên lẫn số
- **Dữ liệu vào**: `PUT /api/users/me` · `{"fullName": "Nguyen Van 123", "phoneNumber": "0987654321", "avatarUrl": null}`
- **Kết quả mong đợi**: HTTP `400` · `fieldErrors.fullName` = `Họ tên chỉ gồm chữ và dấu cách, từ 2 đến 100 ký tự` · dữ liệu cũ không bị ghi đè

**USER-06 · Số điện thoại có chữ** — Ưu tiên: Trung bình · Tự động hoá: API
- **Scenario**: nhập số điện thoại lẫn chữ
- **Dữ liệu vào**: `PUT /api/users/me` · `{"fullName": "Nguyễn Văn Mua", "phoneNumber": "09abc", "avatarUrl": null}`
- **Kết quả mong đợi**: HTTP `400` · `fieldErrors.phoneNumber` = `Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0`

**USER-07 · Số điện thoại thiếu số** — Ưu tiên: Trung bình · Tự động hoá: API
- **Scenario**: nhập số điện thoại chỉ 4 chữ số
- **Dữ liệu vào**: `PUT /api/users/me` · `{"fullName": "Nguyễn Văn Mua", "phoneNumber": "0912", "avatarUrl": null}`
- **Kết quả mong đợi**: HTTP `400` · `fieldErrors.phoneNumber` = `Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0`

**USER-08 · Ảnh đại diện không phải đường dẫn http** — Ưu tiên: Thấp · Tự động hoá: API
- **Scenario**: nhập tên file thay vì đường dẫn đầy đủ
- **Dữ liệu vào**: `PUT /api/users/me` · `{"fullName": "Nguyễn Văn Mua", "phoneNumber": "0987654321", "avatarUrl": "abc.png"}`
- **Kết quả mong đợi**: HTTP `400` · `fieldErrors.avatarUrl` = `Ảnh đại diện phải là đường dẫn bắt đầu bằng http:// hoặc https://`

**USER-09 · Bỏ trống các trường không bắt buộc** — Ưu tiên: Thấp · Tự động hoá: API
- **Scenario**: người dùng xoá hết thông tin và lưu lại
- **Dữ liệu vào**: `PUT /api/users/me` · `{"fullName": "", "phoneNumber": "", "avatarUrl": null}`
- **Kết quả mong đợi**: HTTP `200` · không báo lỗi · các trường được lưu là rỗng/null

## B. Sổ địa chỉ

**USER-10 · Xem sổ địa chỉ** — Ưu tiên: Cao · Tự động hoá: API
- **Scenario**: người mua đã có 2 địa chỉ, mở danh sách
- **Dữ liệu vào**: `GET /api/users/me/addresses` · token buyer
- **Kết quả mong đợi**: HTTP `200` · mảng địa chỉ, **địa chỉ có `defaultAddress` = true đứng đầu**, các địa chỉ còn lại sắp theo id giảm dần

**USER-11 · Thêm địa chỉ mới** — Ưu tiên: Cao · Tự động hoá: Unit `UserProfileServiceTest`
- **Scenario**: người mua thêm một địa chỉ giao hàng đầy đủ thông tin
- **Dữ liệu vào**: `POST /api/users/me/addresses` · token buyer
  ```json
  {"recipientName": "Nguyễn Văn Mua", "phoneNumber": "0987654321",
   "detail": "Số 5 ngõ 12 Nguyễn Trãi", "ward": "Phường Thượng Đình",
   "district": "Quận Thanh Xuân", "city": "Hà Nội", "defaultAddress": false}
  ```
- **Kết quả mong đợi**: HTTP `201` · body có `id` (số), các trường đúng như gửi lên, `defaultAddress` = false · bảng `addresses` có thêm 1 dòng

**USER-12 · Địa chỉ có ngoặc đơn và dấu cộng** — Ưu tiên: Trung bình · Tự động hoá: Unit `AddressRequestValidationTest`
- **Scenario**: địa chỉ thật thường có ngoặc đơn hoặc dấu cộng, hệ thống phải cho phép
- **Dữ liệu vào**: `POST /api/users/me/addresses` · `detail` = `Km 9+200 (cạnh Vincom)`, các trường khác như USER-11
- **Kết quả mong đợi**: HTTP `201` · `detail` lưu đúng nguyên văn `Km 9+200 (cạnh Vincom)`

**USER-13 · Địa chỉ chứa ký tự lạ** — Ưu tiên: Trung bình · Tự động hoá: Unit `AddressRequestValidationTest`
- **Scenario**: nhập địa chỉ có thẻ HTML
- **Dữ liệu vào**: `POST /api/users/me/addresses` · `detail` = `Số 5 <script>`, các trường khác như USER-11
- **Kết quả mong đợi**: HTTP `400` · `fieldErrors.detail` = `Số nhà và tên đường chứa ký tự không được phép`

**USER-14 · Tên người nhận có chữ số** — Ưu tiên: Trung bình · Tự động hoá: Unit `AddressRequestValidationTest`
- **Scenario**: nhập tên người nhận lẫn số
- **Dữ liệu vào**: `POST /api/users/me/addresses` · `recipientName` = `Nguyen Van 123`, các trường khác như USER-11
- **Kết quả mong đợi**: HTTP `400` · `fieldErrors.recipientName` = `Tên người nhận chỉ gồm chữ và dấu cách, từ 2 đến 100 ký tự`

**USER-15 · Thiếu trường bắt buộc** — Ưu tiên: Trung bình · Tự động hoá: API
- **Scenario**: để trống phường/xã
- **Dữ liệu vào**: `POST /api/users/me/addresses` · `ward` = `""`, các trường khác như USER-11
- **Kết quả mong đợi**: HTTP `400` · `fieldErrors.ward` = `Phường/xã không được để trống`

**USER-16 · Đặt địa chỉ mới làm mặc định** — Ưu tiên: Cao · Tự động hoá: Unit `UserProfileServiceTest`
- **Scenario**: 1) Người mua đã có một địa chỉ mặc định. 2) Thêm địa chỉ mới và tick đặt làm mặc định. 3) Xem lại danh sách
- **Dữ liệu vào**: `POST /api/users/me/addresses` · như USER-11 nhưng `"defaultAddress": true`
- **Kết quả mong đợi**: HTTP `201` với `defaultAddress` = true · trong `GET /api/users/me/addresses`, **chỉ có đúng một địa chỉ** `defaultAddress` = true (địa chỉ cũ đã bị bỏ mặc định)

**USER-17 · Thêm địa chỉ không đặt mặc định** — Ưu tiên: Trung bình · Tự động hoá: Unit `UserProfileServiceTest`
- **Scenario**: thêm địa chỉ mới nhưng không tick mặc định
- **Dữ liệu vào**: `POST /api/users/me/addresses` · `"defaultAddress": false`
- **Kết quả mong đợi**: HTTP `201` · địa chỉ mặc định cũ **không thay đổi**

**USER-18 · Sửa địa chỉ của mình** — Ưu tiên: Cao · Tự động hoá: API
- **Scenario**: 1) Lấy id một địa chỉ của mình từ `GET /api/users/me/addresses`. 2) Sửa số nhà và số điện thoại
- **Dữ liệu vào**: `PUT /api/users/me/addresses/{id}` · token buyer · `detail` = `Số 99 Nguyễn Trãi`, `phoneNumber` = `0912345678`, các trường khác giữ nguyên
- **Kết quả mong đợi**: HTTP `200` · body trả dữ liệu mới · `GET` lại thấy đúng dữ liệu đã sửa

**USER-19 · Sửa địa chỉ của người khác** — Ưu tiên: Cao · Tự động hoá: Unit `UserProfileServiceTest`
- **Scenario**: dùng token buyer nhưng gửi id địa chỉ thuộc tài khoản khác (hoặc id không tồn tại, ví dụ 99999)
- **Dữ liệu vào**: `PUT /api/users/me/addresses/99999` · token buyer · body hợp lệ như USER-11
- **Kết quả mong đợi**: HTTP `404` · `message` = `Không tìm thấy địa chỉ`

**USER-20 · Xoá địa chỉ** — Ưu tiên: Cao · Tự động hoá: Unit `UserProfileServiceTest`
- **Scenario**: 1) Xoá một địa chỉ của mình. 2) Thử xoá một id không thuộc về mình
- **Dữ liệu vào**: 1) `DELETE /api/users/me/addresses/{id của mình}` · 2) `DELETE /api/users/me/addresses/99999`
- **Kết quả mong đợi**: bước 1 trả HTTP `204` không body, địa chỉ biến khỏi danh sách · bước 2 trả HTTP `404` với `message` = `Không tìm thấy địa chỉ`

---

## C. Test case giao diện (kiểm thử thủ công)

**USER-UI-01 · Ô số điện thoại chỉ nhận số**
- **Scenario**: mở `/account`, gõ chữ và ký tự đặc biệt vào ô Số điện thoại
- **Dữ liệu vào**: gõ `abc0912-345`
- **Kết quả mong đợi**: ô chỉ hiện `0912345`, các ký tự chữ và dấu gạch bị bỏ ngay khi gõ

**USER-UI-02 · Họ tên có số thì báo lỗi tại chỗ**
- **Scenario**: mở `/account`, nhập họ tên có số, bấm Lưu thông tin
- **Dữ liệu vào**: họ tên = `Nguyen Van 123`
- **Kết quả mong đợi**: ô viền đỏ, dưới ô hiện `Họ tên chỉ được gồm chữ và dấu cách`, không gửi request

**USER-UI-03 · Lưu hồ sơ thành công**
- **Scenario**: mở `/account`, nhập đúng họ tên và số điện thoại, bấm Lưu thông tin
- **Dữ liệu vào**: họ tên = `Nguyễn Văn Mua`, số điện thoại = `0987654321`
- **Kết quả mong đợi**: banner xanh `Đã cập nhật thông tin cá nhân` hiện giữa trên và tự tắt sau 3 giây; tải lại trang vẫn thấy dữ liệu mới

**USER-UI-04 · Đổi địa chỉ mặc định**
- **Scenario**: mở `/account`, thêm địa chỉ mới có tick "Đặt làm địa chỉ mặc định"
- **Dữ liệu vào**: địa chỉ hợp lệ như USER-11, tick mặc định
- **Kết quả mong đợi**: địa chỉ mới có nhãn xanh `Mặc định`, địa chỉ cũ mất nhãn đó

**USER-UI-05 · Sửa địa chỉ**
- **Scenario**: mở `/account`, bấm Sửa ở một địa chỉ
- **Dữ liệu vào**: không nhập gì thêm
- **Kết quả mong đợi**: form bên dưới được điền sẵn toàn bộ dữ liệu của địa chỉ đó, nút đổi thành `Cập nhật địa chỉ`, có thêm nút `Huỷ`

**USER-UI-06 · Giỏ hàng tự chọn địa chỉ mặc định**
- **Scenario**: sau khi đã có địa chỉ mặc định, mở `/cart`
- **Dữ liệu vào**: không
- **Kết quả mong đợi**: ô Địa chỉ giao hàng đã chọn sẵn địa chỉ mặc định; trong danh sách chọn có thêm tuỳ chọn `Nhập địa chỉ khác...`

**USER-UI-07 · Xoá địa chỉ**
- **Scenario**: mở `/account`, bấm Xoá ở một địa chỉ
- **Dữ liệu vào**: địa chỉ bất kỳ
- **Kết quả mong đợi**: banner xanh `Đã xoá địa chỉ`; danh sách cập nhật ngay, không cần tải lại trang

---

## D. Lệnh mẫu để tự động hoá

```bash
GW=http://localhost:8080
BUYER=$(curl -s -X POST $GW/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"buyer@nhom14.vn","password":"buyer123"}' | jq -r .accessToken)

# USER-04
curl -s -X PUT $GW/api/users/me -H "Authorization: Bearer $BUYER" \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Nguyễn Văn Mua","phoneNumber":"0987654321","avatarUrl":null}' | jq

# USER-13: mong đợi 400 kèm fieldErrors.detail
curl -s -X POST $GW/api/users/me/addresses -H "Authorization: Bearer $BUYER" \
  -H 'Content-Type: application/json' \
  -d '{"recipientName":"Nguyễn Văn Mua","phoneNumber":"0987654321","detail":"Số 5 <script>","ward":"Phường 1","district":"Quận 1","city":"Hà Nội","defaultAddress":false}' | jq

# USER-20: xoá địa chỉ vừa tạo để không để lại dữ liệu rác
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X DELETE \
  $GW/api/users/me/addresses/<id> -H "Authorization: Bearer $BUYER"
```

**Cần dọn dữ liệu sau khi chạy**: xoá các địa chỉ do USER-11, USER-12, USER-16, USER-17 tạo ra;
trả hồ sơ buyer về `fullName` = `Nguyễn Văn Mua`, `phoneNumber` = `0987654321`.
