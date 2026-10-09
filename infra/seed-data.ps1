# Nap du lieu mau qua API gateway (:8080). Chay sau khi toan bo service da khoi dong, tren DB trong.
$ErrorActionPreference = 'Stop'
$api = 'http://localhost:8080/api'
$utf8 = [System.Text.Encoding]::UTF8

function Call($method, $path, $body, $token) {
    $headers = @{}
    if ($token) { $headers['Authorization'] = "Bearer $token" }
    $args = @{ Method = $method; Uri = "$api$path"; Headers = $headers; ContentType = 'application/json; charset=utf-8' }
    if ($null -ne $body) { $args.Body = $utf8.GetBytes(($body | ConvertTo-Json -Depth 6)) }
    Invoke-RestMethod @args
}

function Register($email, $password) {
    try { Call POST '/auth/register' @{ email = $email; password = $password } $null | Out-Null } catch { }
}
function Login($email, $password) { (Call POST '/auth/login' @{ email = $email; password = $password } $null).accessToken }

# 1. Tai khoan
Register 'admin@nhom14.vn' 'admin123'
Register 'seller@nhom14.vn' 'seller123'
Register 'seller2@nhom14.vn' 'seller123'
Register 'buyer@nhom14.vn' 'buyer123'

# Admin chi cap duoc bang SQL (README muc "Tao tai khoan admin dau tien")
$ErrorActionPreference = 'Continue'
docker exec mysql-auth mysql -uroot -proot db_auth -e "DELETE FROM account_roles WHERE account_id=(SELECT id FROM accounts WHERE email='admin@nhom14.vn'); INSERT INTO account_roles (account_id, role) SELECT id,'ADMIN' FROM accounts WHERE email='admin@nhom14.vn';" 2>&1 | Out-Null
$ErrorActionPreference = 'Stop'

$admin = Login 'admin@nhom14.vn' 'admin123'
$seller1 = Login 'seller@nhom14.vn' 'seller123'
$seller2 = Login 'seller2@nhom14.vn' 'seller123'
$buyer = Login 'buyer@nhom14.vn' 'buyer123'

# 2. Danh muc
$categories = @{}
foreach ($c in @(@('Điện tử', 'Thiết bị và phụ kiện điện tử'), @('Thời trang', 'Quần áo, mũ nón, phụ kiện'), @('Gia dụng', 'Đồ dùng trong nhà'))) {
    $categories[$c[0]] = (Call POST '/products/categories' @{ name = $c[0]; description = $c[1] } $admin).id
}

# 3. Cua hang va duyet
$store1 = (Call POST '/stores' @{ name = 'Shop Công Nghệ 14'; description = 'Đồ điện tử chính hãng'; address = '12 Trần Phú, Hà Đông, Hà Nội'; phoneNumber = '0901234567'; logoUrl = '' } $seller1).id
$store2 = (Call POST '/stores' @{ name = 'Shop Thời Trang 14'; description = 'Thời trang giá tốt'; address = '25 Nguyễn Trãi, Thanh Xuân, Hà Nội'; phoneNumber = '0912345678'; logoUrl = '' } $seller2).id
Call PUT "/stores/$store1/status" @{ status = 'ACTIVE' } $admin | Out-Null
Call PUT "/stores/$store2/status" @{ status = 'ACTIVE' } $admin | Out-Null

# Dang nhap lai de token mang quyen SELLER
$seller1 = Login 'seller@nhom14.vn' 'seller123'
$seller2 = Login 'seller2@nhom14.vn' 'seller123'

# 4. San pham
function Product($token, $store, $cat, $name, $desc, $price, $stock, $img) {
    (Call POST '/products' @{ storeId = $store; categoryId = $categories[$cat]; name = $name; description = $desc; price = $price; stockQuantity = $stock; imageUrl = $img } $token).id
}
$p1 = Product $seller1 $store1 'Điện tử' 'Tai nghe Bluetooth Air 3' 'Pin 30 giờ, chống ồn' 890000 20 ''
$p2 = Product $seller1 $store1 'Điện tử' 'Chuột không dây Logi M331' 'Chuột yên tĩnh' 320000 40 ''
$p3 = Product $seller1 $store1 'Gia dụng' 'Bình giữ nhiệt 500ml' 'Giữ nóng 12 giờ' 250000 50 ''
$p4 = Product $seller1 $store1 'Thời trang' 'Áo thun cotton basic' 'Vải cotton thoáng mát' 180000 90 ''
$p5 = Product $seller1 $store1 'Điện tử' 'Sản phẩm hết hàng' 'Dùng để thử hết hàng' 100000 0 ''
$p6 = Product $seller2 $store2 'Thời trang' 'Mũ lưỡi trai' 'Mũ cotton nhiều màu' 150000 15 ''
$p7 = Product $seller2 $store2 'Thời trang' 'Quần jean nam slim fit' 'Co giãn nhẹ' 420000 30 ''

# 5. Khuyen mai va ma giam gia
$now = [DateTime]::UtcNow
$from = $now.AddDays(-1).ToString('o'); $to = $now.AddDays(60).ToString('o')
Call POST "/products/$p1/promotions" @{ discountPercent = 20; startsAt = $from; endsAt = $to } $seller1 | Out-Null
Call POST "/products/$p7/promotions" @{ discountPercent = 10; startsAt = $from; endsAt = $to } $seller2 | Out-Null
Call POST '/orders/vouchers' @{ code = 'NHOM14'; discountPercent = 10; minimumOrderAmount = 500000; remainingUses = 50; startsAt = $from; endsAt = $to } $admin | Out-Null
Call POST '/orders/vouchers' @{ code = 'SALE15'; discountPercent = 15; minimumOrderAmount = 200000; remainingUses = 50; startsAt = $from; endsAt = $to } $admin | Out-Null

# 6. Dia chi va don hang mau cua nguoi mua
Call POST '/users/me/addresses' @{ recipientName = 'Nguyễn Văn Mua'; phoneNumber = '0987654321'; detail = 'Số 5 ngõ 12 Nguyễn Trãi'; ward = 'Phường Thượng Đình'; district = 'Quận Thanh Xuân'; city = 'Hà Nội'; defaultAddress = $true } $buyer | Out-Null
$addr = 'Nguyễn Văn Mua, 0987654321, Số 5 ngõ 12 Nguyễn Trãi, Phường Thượng Đình, Quận Thanh Xuân, Hà Nội'

# Don 1: giao thanh cong (de thu danh gia)
Call POST '/orders/cart/items' @{ productId = $p2; quantity = 1 } $buyer | Out-Null
Call POST '/orders/cart/items' @{ productId = $p7; quantity = 1 } $buyer | Out-Null
$orders = Call POST '/orders/checkout' @{ shippingAddress = $addr; paymentMethod = 'COD'; voucherCode = $null } $buyer
foreach ($o in $orders) {
    $sellerToken = if ($o.storeId -eq $store1) { $seller1 } else { $seller2 }
    foreach ($s in 'CONFIRMED', 'PACKING', 'SHIPPING', 'DELIVERED') { Call PUT "/orders/$($o.id)/status?status=$s" $null $sellerToken | Out-Null }
}

# Don 2: dang cho xu ly
Call POST '/orders/cart/items' @{ productId = $p1; quantity = 1 } $buyer | Out-Null
Call POST '/orders/checkout' @{ shippingAddress = $addr; paymentMethod = 'BANK_TRANSFER'; voucherCode = $null } $buyer | Out-Null

Write-Output 'Xong. Tai khoan: admin@nhom14.vn/admin123, seller@nhom14.vn/seller123, seller2@nhom14.vn/seller123, buyer@nhom14.vn/buyer123'
