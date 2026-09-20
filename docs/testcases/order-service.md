# Test case — order-service

## 1. Thông tin chung

| Hạng mục | Nội dung |
|---|---|
| Service | order-service, cổng 8085 |
| Gọi qua gateway | `http://localhost:8080/api/orders` |
| Cơ sở dữ liệu | MySQL `db_order` (cổng 3314): `orders`, `order_items`, `reviews`, `vouchers`; Redis lưu giỏ hàng |
| Chức năng phụ trách | Giỏ hàng, đặt hàng, thanh toán, huỷ đơn, đánh giá, mã giảm giá |
| Phụ thuộc | product-service (giá, tồn kho), store-service (cửa hàng của người bán) |

Vòng đời đơn hàng: `PENDING` → `CONFIRMED` → `PACKING` → `SHIPPING` → `DELIVERED`.
Có thể huỷ (`CANCELLED`) khi còn ở 3 trạng thái đầu. Từ `SHIPPING` trở đi **không ai huỷ được**.

## 2. Test case API — giỏ hàng

| Mã | Mục đích | Phương thức & đường dẫn | Dữ liệu / điều kiện | Kết quả mong đợi | HTTP | Ưu tiên | Tự động hoá |
|---|---|---|---|---|---|---|---|
| ORDER-01 | Xem giỏ hàng khi chưa có gì | `GET /cart` | tài khoản mới | Danh sách rỗng `[]` | 200 | Trung bình | Unit: CartServiceTest |
| ORDER-02 | Thêm sản phẩm vào giỏ | `POST /cart/items` | `{"productId":1,"quantity":2}` | Giỏ có 1 dòng, tên và giá lấy từ product-service | 200 | Cao | Unit: CartServiceTest |
| ORDER-03 | Không nhận giá từ phía người dùng | `POST /cart/items` | gửi thêm trường `unitPrice: 1000` | Trường này bị bỏ qua, giá vẫn là giá thật của sản phẩm | 200 | Cao | Unit: CartServiceTest |
| ORDER-04 | Thêm lại sản phẩm đã có thì cộng dồn | `POST /cart/items` hai lần | lần 1 quantity=1, lần 2 quantity=2 | Giỏ vẫn 1 dòng, số lượng = 3 | 200 | Cao | Unit: CartServiceTest |
| ORDER-05 | Đổi số lượng không làm dòng hàng nhảy chỗ | `PUT /cart/items/{id}?quantity=4` | giỏ có 2 dòng, đổi dòng đầu | Thứ tự dòng hàng giữ nguyên | 200 | Trung bình | Unit: CartServiceTest |
| ORDER-06 | Đặt số lượng bằng 0 thì xoá khỏi giỏ | `PUT /cart/items/{id}?quantity=0` | — | Sản phẩm biến khỏi giỏ | 200 | Trung bình | Unit: CartServiceTest |
| ORDER-07 | Số lượng âm | `PUT /cart/items/{id}?quantity=-3` | — | "Số lượng không hợp lệ" | 400 | Trung bình | API |
| ORDER-08 | Thêm quá tồn kho | `POST /cart/items` | quantity lớn hơn tồn kho | "Chỉ còn N sản phẩm trong kho" | 400 | Cao | Unit: CartServiceTest |
| ORDER-09 | Số lượng 0 hoặc âm khi thêm | `POST /cart/items` | quantity = 0 / -3 | "Số lượng phải là số lớn hơn 0" | 400 | Trung bình | API |
| ORDER-10 | Thêm sản phẩm đã bị ẩn | `POST /cart/items` | sản phẩm HIDDEN | Bị từ chối, thông báo sản phẩm không còn bán | 400 | Cao | Unit: CartServiceTest |
| ORDER-11 | Thêm sản phẩm của cửa hàng tạm ngưng | `POST /cart/items` | cửa hàng SUSPENDED | Bị từ chối | 400 | Cao | Unit: CartServiceTest |
| ORDER-12 | Xoá một dòng và xoá cả giỏ | `DELETE /cart/items/{id}`, `DELETE /cart` | — | Xoá đúng dòng / giỏ rỗng hoàn toàn | 200 | Trung bình | Unit: CartServiceTest |
| ORDER-13 | Quản trị viên không có giỏ hàng | `GET /cart` | token admin | Không có quyền | 403 | Cao | API |
| ORDER-14 | Chưa đăng nhập thì không dùng giỏ hàng | `GET /cart` | không token | Bị từ chối | 401 | Cao | API |
| ORDER-15 | Giỏ hàng tự hết hạn sau 30 ngày | kiểm tra Redis | `docker exec redis redis-cli TTL cart:3` | Trả về khoảng 2.592.000 giây | — | Thấp | API |

## 3. Test case API — đặt hàng

| Mã | Mục đích | Phương thức & đường dẫn | Dữ liệu / điều kiện | Kết quả mong đợi | HTTP | Ưu tiên | Tự động hoá |
|---|---|---|---|---|---|---|---|
| ORDER-16 | Đặt hàng thành công | `POST /checkout` | giỏ có hàng, địa chỉ và phương thức hợp lệ | Trả danh sách đơn; tồn kho giảm; giỏ hàng được xoá | 200 | Cao | Unit: OrderServiceTest |
| ORDER-17 | Giỏ hàng trống | `POST /checkout` | giỏ rỗng | "Giỏ hàng đang trống", không gọi trừ kho | 400 | Cao | Unit: OrderServiceTest |
| ORDER-18 | Giỏ nhiều cửa hàng thì tách thành nhiều đơn | `POST /checkout` | giỏ có sản phẩm của 2 cửa hàng | Trả về 2 đơn, mỗi đơn một storeId | 200 | Cao | Unit: OrderWriteServiceTest |
| ORDER-19 | Đơn COD chờ thanh toán | `POST /checkout` | paymentMethod = `COD` | status = PENDING, paymentStatus = PENDING | 200 | Cao | Unit: CustomerOrderTest |
| ORDER-20 | Đơn trả trước ghi nhận đã thanh toán | `POST /checkout` | paymentMethod = `BANK_TRANSFER` | paymentStatus = PAID | 200 | Trung bình | Unit: CustomerOrderTest |
| ORDER-21 | Áp mã giảm giá hợp lệ | `POST /checkout` | voucherCode = `NHOM14` (giảm 10%, đơn tối thiểu 500.000) | discountAmount = 10% giá trị đơn, totalAmount trừ đúng | 200 | Cao | Unit: OrderWriteServiceTest |
| ORDER-22 | Mã giảm giá áp cho từng đơn khi tách | `POST /checkout` | giỏ 2 shop + mã 10% | Mỗi đơn được giảm 10% của chính nó | 200 | Cao | Unit: OrderWriteServiceTest |
| ORDER-23 | Đơn chưa đủ giá trị tối thiểu | `POST /checkout` | tổng giỏ < minimumOrderAmount | "Đơn hàng chưa đạt giá trị tối thiểu để dùng mã này" | 400 | Cao | Unit: OrderWriteServiceTest |
| ORDER-24 | Mã giảm giá không tồn tại | `POST /checkout` | voucherCode = `KHONGCO` | "Không tìm thấy mã giảm giá" | 400 | Trung bình | Unit: OrderWriteServiceTest |
| ORDER-25 | Mã giảm giá hết lượt dùng | `POST /checkout` | voucher remainingUses = 0 | "Mã giảm giá đã hết lượt dùng" | 400 | Trung bình | Unit: OrderWriteServiceTest |
| ORDER-26 | Địa chỉ giao hàng trống hoặc quá dài | `POST /checkout` | rỗng / 600 ký tự | "Địa chỉ giao hàng không được để trống" / "tối đa 500 ký tự" | 400 | Trung bình | API |
| ORDER-27 | Phương thức thanh toán không tồn tại | `POST /checkout` | paymentMethod = `BITCOIN` | "Dữ liệu gửi lên không đúng định dạng" | 400 | Trung bình | API |
| ORDER-28 | Đặt hàng lỗi thì hoàn lại kho | `POST /checkout` | gây lỗi ở bước ghi đơn (ví dụ địa chỉ 600 ký tự) | Tồn kho **không bị hụt**, giỏ hàng vẫn còn | 400 | Cao | Unit: OrderServiceTest |
| ORDER-29 | Quản trị viên không đặt hàng được | `POST /checkout` | token admin | Không có quyền | 403 | Cao | API |

## 4. Test case API — theo dõi, thanh toán, huỷ đơn

| Mã | Mục đích | Phương thức & đường dẫn | Dữ liệu / điều kiện | Kết quả mong đợi | HTTP | Ưu tiên | Tự động hoá |
|---|---|---|---|---|---|---|---|
| ORDER-30 | Xem đơn của mình | `GET /mine` | token buyer | Chỉ đơn của chính mình, mới nhất trước | 200 | Cao | API |
| ORDER-31 | Thanh toán đơn COD | `PUT /{id}/pay` | `{"paymentMethod":"MOMO"}` | paymentStatus = PAID, phương thức được cập nhật | 200 | Cao | API |
| ORDER-32 | Không gửi phương thức thanh toán | `PUT /{id}/pay` | body `{}` | "Hãy chọn phương thức thanh toán" | 400 | Trung bình | API |
| ORDER-33 | Thanh toán hai lần | `PUT /{id}/pay` | đơn đã PAID | "Đơn hàng này đã được thanh toán" | 400 | Cao | Unit: OrderServiceTest |
| ORDER-34 | Thanh toán đơn đã huỷ | `PUT /{id}/pay` | đơn CANCELLED | "Đơn hàng đã bị huỷ, không thể thanh toán" | 400 | Trung bình | API |
| ORDER-35 | Thanh toán đơn của người khác | `PUT /{id}/pay` | id đơn của tài khoản khác | "Đơn hàng không thuộc về bạn" | 403 | Cao | Unit: OrderServiceTest |
| ORDER-36 | Huỷ đơn khi shop chưa giao | `PUT /{id}/cancel` | đơn PENDING/CONFIRMED/PACKING | status = CANCELLED, tồn kho được hoàn, lượt mã giảm giá được hoàn, đơn đã trả tiền chuyển REFUNDED | 200 | Cao | Unit: OrderServiceTest |
| ORDER-37 | Không huỷ được đơn đang giao | `PUT /{id}/cancel` | đơn SHIPPING | "Đơn hàng đang trên đường giao nên không thể huỷ" | 400 | Cao | Unit: OrderServiceTest |
| ORDER-38 | Không huỷ được đơn đã giao | `PUT /{id}/cancel` | đơn DELIVERED | "Đơn hàng đã được giao nên không thể huỷ" | 400 | Cao | Unit: OrderServiceTest |
| ORDER-39 | Huỷ lại đơn đã huỷ | `PUT /{id}/cancel` | đơn CANCELLED | "Đơn hàng đã được huỷ trước đó" | 400 | Thấp | API |
| ORDER-40 | Huỷ đơn của người khác | `PUT /{id}/cancel` | id đơn của tài khoản khác | "Đơn hàng không thuộc về bạn" | 403 | Cao | API |

## 5. Test case API — người bán và quản trị viên

| Mã | Mục đích | Phương thức & đường dẫn | Dữ liệu / điều kiện | Kết quả mong đợi | HTTP | Ưu tiên | Tự động hoá |
|---|---|---|---|---|---|---|---|
| ORDER-41 | Người bán xem đơn của shop mình | `GET /seller` | token SELLER có cửa hàng | Chỉ đơn có storeId của cửa hàng mình | 200 | Cao | API |
| ORDER-42 | Người bán chưa có cửa hàng | `GET /seller` | token SELLER chưa mở shop | "Người bán chưa có cửa hàng được duyệt" | 403 | Trung bình | API |
| ORDER-43 | Chuyển trạng thái đúng thứ tự | `PUT /{id}/status?status=` | CONFIRMED → PACKING → SHIPPING → DELIVERED | Mỗi bước thành công | 200 | Cao | API |
| ORDER-44 | Không nhảy bậc trạng thái | `PUT /{id}/status?status=DELIVERED` | đơn đang PENDING | "Không thể chuyển đơn hàng từ PENDING sang DELIVERED" | 400 | Cao | Unit: OrderServiceTest |
| ORDER-45 | Người bán không xử lý đơn shop khác | `PUT /{id}/status?status=CONFIRMED` | đơn của cửa hàng khác | "Đơn hàng không thuộc cửa hàng của bạn" | 403 | Cao | Unit: OrderServiceTest |
| ORDER-46 | Người bán và admin đều không huỷ được đơn đang giao | `PUT /{id}/status?status=CANCELLED` | đơn SHIPPING | "Đơn hàng đang trên đường giao nên không thể huỷ" | 400 | Cao | Unit: OrderServiceTest |
| ORDER-47 | Admin xem toàn bộ đơn hàng | `GET /admin` | token admin | Danh sách đơn của cả sàn | 200 | Cao | API |
| ORDER-48 | Thống kê đơn hàng | `GET /admin/statistics` | token admin | totalOrders, totalRevenue, paidOrders, deliveredOrders, cancelledOrders, totalReviews, averageRating, ordersByStatus | 200 | Trung bình | API |
| ORDER-49 | Người bán không xem được thống kê sàn | `GET /admin/statistics` | token SELLER | Không có quyền | 403 | Trung bình | API |

## 6. Test case API — đánh giá và mã giảm giá

| Mã | Mục đích | Phương thức & đường dẫn | Dữ liệu / điều kiện | Kết quả mong đợi | HTTP | Ưu tiên | Tự động hoá |
|---|---|---|---|---|---|---|---|
| ORDER-50 | Đánh giá sau khi nhận hàng | `POST /{id}/reviews` | đơn DELIVERED, sản phẩm có trong đơn | Lưu đánh giá, trả rating và comment | 201 | Cao | Unit: ReviewServiceTest |
| ORDER-51 | Chưa nhận hàng thì chưa đánh giá được | `POST /{id}/reviews` | đơn SHIPPING | "Chỉ đánh giá được sau khi nhận hàng" | 400 | Cao | Unit: ReviewServiceTest |
| ORDER-52 | Không đánh giá đơn người khác | `POST /{id}/reviews` | đơn của tài khoản khác | "Đơn hàng không thuộc về bạn" | 403 | Cao | Unit: ReviewServiceTest |
| ORDER-53 | Sản phẩm không có trong đơn | `POST /{id}/reviews` | productId lạ | "Sản phẩm không có trong đơn hàng này" | 400 | Trung bình | Unit: ReviewServiceTest |
| ORDER-54 | Mỗi sản phẩm một đơn chỉ đánh giá một lần | `POST /{id}/reviews` | đã đánh giá trước đó | "Bạn đã đánh giá sản phẩm này trong đơn hàng" | 409 | Cao | Unit: ReviewServiceTest |
| ORDER-55 | Số sao ngoài khoảng 1-5 | `POST /{id}/reviews` | rating = 0 / 10 | "Số sao phải từ 1 đến 5" | 400 | Trung bình | API |
| ORDER-56 | Xem đánh giá của sản phẩm (công khai) | `GET /reviews?productId=1` | không token | Danh sách rating, comment, createdAt; **không có mã người mua và mã đơn** | 200 | Cao | API |
| ORDER-57 | Điểm sao trung bình | `GET /reviews/summary?productIds=1,2,3` | không token | averageRating và reviewCount cho từng sản phẩm; sản phẩm chưa có đánh giá thì bằng 0 | 200 | Cao | Unit: ReviewServiceTest |
| ORDER-58 | Admin tạo mã giảm giá | `POST /vouchers` | code, phần trăm, đơn tối thiểu, số lượt, thời gian hợp lệ | Tạo thành công | 201 | Cao | API |
| ORDER-59 | Mã có ký tự đặc biệt hoặc khoảng trắng | `POST /vouchers` | code = `SALE 10%!` | "Mã giảm giá chỉ gồm chữ và số, từ 3 đến 20 ký tự" | 400 | Trung bình | API |
| ORDER-60 | Mã trùng | `POST /vouchers` | code đã tồn tại | "Mã giảm giá đã tồn tại" | 409 | Trung bình | API |
| ORDER-61 | Mã đã hết hạn | `POST /vouchers` | endsAt ở quá khứ | "Mã giảm giá đã hết hạn" | 400 | Trung bình | API |
| ORDER-62 | Số lượt dùng không hợp lệ | `POST /vouchers` | remainingUses = 0, discountPercent = 200 | Báo lỗi đúng từng trường | 400 | Trung bình | API |
| ORDER-63 | Khách xem mã đang chạy | `GET /vouchers/active` | không token | Chỉ mã còn lượt và còn trong thời gian áp dụng | 200 | Cao | API |
| ORDER-64 | Người mua không xem được toàn bộ mã | `GET /vouchers` | token buyer | Không có quyền | 403 | Trung bình | API |
| ORDER-65 | Admin xoá mã giảm giá | `DELETE /vouchers/{id}` | token admin | Xoá thành công | 204 | Thấp | API |

## 7. Test case giao diện (kiểm thử thủ công)

| Mã | Màn hình | Thao tác | Kết quả mong đợi |
|---|---|---|---|
| ORDER-UI-01 | `/` | Bấm Thêm vào giỏ khi chưa đăng nhập | Thông báo đỏ "Bạn cần đăng nhập để thêm vào giỏ hàng" |
| ORDER-UI-02 | Header | Sau khi thêm 2 sản phẩm | Số trên icon Giỏ hàng bằng tổng số lượng |
| ORDER-UI-03 | `/cart` | Bấm `+` / `-` | Số lượng đổi, dòng hàng không nhảy chỗ, tổng tiền tính lại |
| ORDER-UI-04 | `/cart` | Bấm `-` khi số lượng bằng 1 | Sản phẩm bị xoá khỏi giỏ |
| ORDER-UI-05 | `/cart` | Bấm `+` khi đã bằng tồn kho | Nút `+` bị mờ, không bấm được |
| ORDER-UI-06 | `/cart` | Bấm nhãn mã `NHOM14` | Ô mã được điền, hiện dòng "Giảm giá dự kiến" và tổng cộng mới |
| ORDER-UI-07 | `/cart` | Đặt hàng khi giỏ có sản phẩm của 2 shop | Thông báo "... được tách thành 2 đơn: #x, #y", chuyển sang `/orders` |
| ORDER-UI-08 | `/orders` | Bấm Thanh toán ở đơn COD | Popup 4 phương thức; chọn xong nút Thanh toán biến mất, nhãn đổi "Đã thanh toán" |
| ORDER-UI-09 | `/orders` | Bấm Huỷ đơn ở đơn chờ xác nhận | Popup xác nhận, khung vàng ghi hoàn tiền 1-3 ngày làm việc |
| ORDER-UI-10 | `/orders` | Xem đơn đang giao | Không có nút Huỷ đơn, hiện chữ "Đơn đang trên đường giao nên không thể huỷ." |
| ORDER-UI-11 | `/orders` | Bấm Đánh giá ở đơn đã nhận hàng | Popup chọn sao + nhận xét; gửi xong nhãn đổi thành "Đã đánh giá" |
| ORDER-UI-12 | `/products/{id}` | Sau khi đánh giá | Nhận xét hiện trong mục Đánh giá & bình luận, tên hiển thị là "Khách đã mua hàng" |
| ORDER-UI-13 | `/seller` tab Đơn hàng | Bấm lần lượt các nút chuyển trạng thái | Chỉ hiện bước hợp lệ tiếp theo, không có nút nhảy bậc |
| ORDER-UI-14 | `/admin` tab Đơn hàng | Xem đơn đang giao | Dropdown chỉ còn "Đã giao xong", không có tuỳ chọn Huỷ đơn |
| ORDER-UI-15 | `/admin` tab Mã giảm giá | Tạo mã có khoảng trắng | Ô viền đỏ kèm thông báo, không gọi API |

## 8. Gợi ý khi tự động hoá

```bash
GW=http://localhost:8080
BUYER=...  # token buyer
SELLER=... # token seller

# Kịch bản đầu-cuối (ORDER-16 → ORDER-50)
curl -s -o /dev/null -X DELETE $GW/api/orders/cart -H "Authorization: Bearer $BUYER"
curl -s -o /dev/null -X POST $GW/api/orders/cart/items -H "Authorization: Bearer $BUYER" \
  -H 'Content-Type: application/json' -d '{"productId":1,"quantity":1}'
OID=$(curl -s -X POST $GW/api/orders/checkout -H "Authorization: Bearer $BUYER" \
  -H 'Content-Type: application/json' \
  -d '{"shippingAddress":"Số 5 Nguyễn Trãi, Hà Nội","paymentMethod":"COD","voucherCode":null}' \
  | jq '.[0].id')

for s in CONFIRMED PACKING SHIPPING DELIVERED; do
  curl -s -o /dev/null -X PUT "$GW/api/orders/$OID/status?status=$s" -H "Authorization: Bearer $SELLER"
done

curl -s -X POST $GW/api/orders/$OID/reviews -H "Authorization: Bearer $BUYER" \
  -H 'Content-Type: application/json' -d '{"productId":1,"rating":5,"comment":"Tốt"}' | jq
```

Lưu ý khi tự động hoá nhóm này:

- Mỗi lần chạy sẽ **trừ tồn kho thật**, nên hoặc dùng sản phẩm riêng cho test, hoặc hoàn kho sau khi chạy.
- ORDER-37 và ORDER-38 cần đơn ở trạng thái SHIPPING/DELIVERED nên phải chuẩn bị bằng token người bán trước.
- ORDER-58 đến ORDER-65 tạo mã giảm giá thật, nên xoá mã sau khi test (ORDER-65).
