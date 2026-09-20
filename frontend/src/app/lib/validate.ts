/**
 * Các hàm kiểm tra dữ liệu người dùng nhập ở phía giao diện.
 * Mỗi hàm trả về câu thông báo lỗi, hoặc null nếu dữ liệu hợp lệ.
 * Backend cũng kiểm tra lại y như vậy, đây chỉ là để báo lỗi ngay cho người dùng.
 */

/** Chỉ gồm chữ (kể cả chữ có dấu) và dấu cách. */
const NAME_PATTERN = /^[\p{L} ]+$/u;

/** Tên hàng hoá, cửa hàng, danh mục: chữ, số và các dấu hay gặp (giống quy tắc ở backend). */
const TEXT_PATTERN = /^[\p{L}\p{N} .,\-_/&+()%:'"#!?]+$/u;

/** Địa chỉ: cho thêm ngoặc đơn, dấu + và # như "Km 9+200", "Toà A1 (cạnh Vincom)". */
const ADDRESS_PATTERN = /^[\p{L}\p{N} .,\-/()+#:]+$/u;

/** Số điện thoại cá nhân: 10 chữ số, bắt đầu bằng 0. */
const PHONE_PATTERN = /^0\d{9}$/;

/** Cửa hàng được dùng thêm hotline dạng 1900xxxx hoặc 1800xxxx. */
const STORE_PHONE_PATTERN = /^(0\d{9}|1[89]00\d{4,6})$/;

/** Mã giảm giá: chỉ chữ và số. */
const VOUCHER_PATTERN = /^[A-Za-z0-9]{3,20}$/;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function checkRequired(value: string, label: string): string | null {
  return value.trim() === "" ? `${label} không được để trống` : null;
}

export function checkEmail(value: string): string | null {
  if (value.trim() === "") return "Email không được để trống";
  return EMAIL_PATTERN.test(value.trim()) ? null : "Email không đúng định dạng";
}

export function checkPassword(value: string): string | null {
  if (value === "") return "Mật khẩu không được để trống";
  if (value.length < 6) return "Mật khẩu phải từ 6 ký tự";
  return value.length <= 72 ? null : "Mật khẩu tối đa 72 ký tự";
}

/** Họ tên, tên người nhận: không cho số và ký tự đặc biệt. */
export function checkName(
  value: string,
  label: string,
  required = true,
): string | null {
  if (value.trim() === "")
    return required ? `${label} không được để trống` : null;
  if (!NAME_PATTERN.test(value.trim()))
    return `${label} chỉ được gồm chữ và dấu cách`;
  return value.trim().length >= 2 ? null : `${label} phải có ít nhất 2 ký tự`;
}

/** Tên cửa hàng, tên sản phẩm, địa chỉ: cho chữ và số, không cho ký tự đặc biệt lạ. */
export function checkText(
  value: string,
  label: string,
  required = true,
): string | null {
  if (value.trim() === "")
    return required ? `${label} không được để trống` : null;
  return TEXT_PATTERN.test(value.trim())
    ? null
    : `${label} chứa ký tự không được phép`;
}

/** Dùng cho các ô địa chỉ: số nhà, phường/xã, quận/huyện, tỉnh/thành phố. */
export function checkAddress(value: string, label: string): string | null {
  if (value.trim() === "") return `${label} không được để trống`;
  return ADDRESS_PATTERN.test(value.trim())
    ? null
    : `${label} chứa ký tự không được phép`;
}

export function checkPhone(value: string, required = true): string | null {
  if (value.trim() === "")
    return required ? "Số điện thoại không được để trống" : null;
  return PHONE_PATTERN.test(value.trim())
    ? null
    : "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0";
}

/** Số điện thoại cửa hàng: cho phép cả hotline 1900/1800. */
export function checkStorePhone(value: string): string | null {
  if (value.trim() === "") return "Số điện thoại không được để trống";
  return STORE_PHONE_PATTERN.test(value.trim())
    ? null
    : "Số điện thoại phải là 10 chữ số bắt đầu bằng 0, hoặc hotline 1900/1800";
}

/** Ô nhập số: rỗng, chứa chữ hoặc nhỏ hơn mức tối thiểu đều báo lỗi. */
export function checkNumber(
  value: string,
  label: string,
  options: { min?: number; max?: number } = {},
): string | null {
  const { min = 0, max } = options;
  if (value.trim() === "") return `${label} không được để trống`;
  if (!/^\d+$/.test(value.trim())) return `${label} chỉ được nhập số`;
  const number = Number(value);
  if (number < min)
    return `${label} phải lớn hơn hoặc bằng ${min.toLocaleString("vi-VN")}`;
  if (max !== undefined && number > max) {
    return `${label} tối đa ${max.toLocaleString("vi-VN")}`;
  }
  return null;
}

export function checkVoucherCode(value: string): string | null {
  if (value.trim() === "") return "Mã giảm giá không được để trống";
  return VOUCHER_PATTERN.test(value.trim())
    ? null
    : "Mã giảm giá chỉ gồm chữ và số, từ 3 đến 20 ký tự";
}

/** Đường dẫn ảnh không bắt buộc, nhưng nếu nhập thì phải là http/https. */
export function checkImageUrl(value: string): string | null {
  if (value.trim() === "") return null;
  return /^https?:\/\/\S+$/.test(value.trim())
    ? null
    : "Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://";
}

/** Gom các lỗi lại; trả về lỗi đầu tiên tìm thấy để hiện thông báo chung. */
export function firstError(
  errors: Record<string, string | null>,
): string | null {
  for (const message of Object.values(errors)) {
    if (message) return message;
  }
  return null;
}

/** Bỏ mọi ký tự không phải chữ số, dùng cho ô chỉ cho nhập số. */
export function keepDigitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}
