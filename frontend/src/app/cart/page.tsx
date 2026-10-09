"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  AdminNotAllowed,
  Badge,
  Button,
  Card,
  Empty,
  Field,
  PageHeader,
  RequireLogin,
  Select,
  TextInput,
} from "../components/ui";
import { api, errorMessage } from "../lib/api";
import { useCart } from "../lib/cart";
import { formatCurrency } from "../lib/format";
import { PAYMENT_METHODS } from "../lib/payment";
import { useLoadEffect } from "../lib/hooks";
import { useSession } from "../lib/session";
import { useNotify } from "../lib/toast";
import type { Address, Order, PaymentMethod, Voucher } from "../lib/types";

export default function CartPage() {
  const { token, isAdmin } = useSession();
  const notify = useNotify();
  const router = useRouter();
  const { items, subtotal, setQuantity, removeItem, clear } = useCart();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [chosenAddressId, setChosenAddressId] = useState<string | null>(null);
  const [manualAddress, setManualAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [voucherCode, setVoucherCode] = useState("");
  const [placing, setPlacing] = useState(false);

  const load = useCallback(async () => {
    const [voucherData, addressData] = await Promise.all([
      api<Voucher[]>("/api/orders/vouchers/active").catch(
        () => [] as Voucher[],
      ),
      token
        ? api<Address[]>("/api/users/me/addresses", { token }).catch(
            () => [] as Address[],
          )
        : Promise.resolve([] as Address[]),
    ]);
    setVouchers(voucherData);
    setAddresses(addressData);
  }, [token]);

  useLoadEffect(load);

  if (!token) {
    return (
      <>
        <PageHeader title="Giỏ hàng" />
        <RequireLogin
          next="/cart"
          message="Đăng nhập để xem giỏ hàng của bạn."
        />
      </>
    );
  }

  if (isAdmin) {
    return (
      <>
        <PageHeader title="Giỏ hàng" />
        <AdminNotAllowed feature="giỏ hàng và mua hàng" />
      </>
    );
  }

  const preferredAddress =
    addresses.find((address) => address.defaultAddress) ?? addresses[0];
  const addressId =
    chosenAddressId ?? (preferredAddress ? String(preferredAddress.id) : "");
  const selectedVoucher = vouchers.find(
    (voucher) => voucher.code === voucherCode.trim().toUpperCase(),
  );
  const estimatedDiscount =
    selectedVoucher && subtotal >= selectedVoucher.minimumOrderAmount
      ? Math.round((subtotal * selectedVoucher.discountPercent) / 100)
      : 0;

  const shippingAddress = () => {
    const chosen = addresses.find(
      (address) => String(address.id) === addressId,
    );
    if (chosen) {
      return `${chosen.recipientName} - ${chosen.phoneNumber} - ${chosen.detail}, ${chosen.ward}, ${chosen.district}, ${chosen.city}`;
    }
    return manualAddress.trim();
  };

  const checkout = async () => {
    const address = shippingAddress();
    if (!address) {
      notify("Hãy chọn hoặc nhập địa chỉ giao hàng.", "error");
      return;
    }
    setPlacing(true);
    try {
      const orders = await api<Order[]>("/api/orders/checkout", {
        method: "POST",
        token,
        body: {
          shippingAddress: address,
          paymentMethod,
          voucherCode: voucherCode.trim() || null,
        },
      });
      clear();
      notify(
        orders.length === 1
          ? `Đặt hàng thành công. Mã đơn #${orders[0].id}`
          : `Đặt hàng thành công. Giỏ hàng có sản phẩm của ${orders.length} cửa hàng nên được tách thành ${orders.length} đơn: ` +
              orders.map((order) => `#${order.id}`).join(", "),
        "success",
      );
      router.push("/orders");
    } catch (error) {
      notify(errorMessage(error, "Không thể đặt hàng."), "error");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <>
      <PageHeader title="Giỏ hàng" />

      {items.length === 0 ? (
        <Card>
          <Empty>Giỏ hàng đang trống.</Empty>
          <Link
            href="/"
            className="inline-block bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            Tiếp tục mua sắm
          </Link>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <Card title="Sản phẩm đã thêm">
            <ul className="divide-y divide-stone-100">
              {items.map((item) => (
                <li key={item.productId} className="flex gap-4 py-4 first:pt-0">
                  <Link
                    href={`/products/${item.productId}`}
                    className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden bg-stone-100 text-xs text-slate-400"
                  >
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      "Chưa có ảnh"
                    )}
                  </Link>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link
                        href={`/products/${item.productId}`}
                        className="font-medium hover:text-teal-800"
                      >
                        {item.productName}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        Xoá
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-teal-800">
                      {formatCurrency(item.unitPrice)}
                      {item.discountPercent > 0 && (
                        <>
                          <span className="ml-2 text-xs text-slate-400 line-through">
                            {formatCurrency(item.originalPrice)}
                          </span>
                          <Badge tone="danger">-{item.discountPercent}%</Badge>
                        </>
                      )}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          className="px-2 py-1"
                          onClick={() =>
                            setQuantity(item.productId, item.quantity - 1)
                          }
                        >
                          -
                        </Button>
                        <span className="w-8 text-center text-sm">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          className="px-2 py-1"
                          disabled={item.quantity >= item.stockQuantity}
                          onClick={() =>
                            setQuantity(item.productId, item.quantity + 1)
                          }
                        >
                          +
                        </Button>
                        <span className="text-xs text-slate-400">
                          còn {item.stockQuantity} sản phẩm
                        </span>
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <div className="space-y-5">
            <Card title="Thông tin giao hàng">
              <div className="space-y-3">
                <Field label="Địa chỉ giao hàng">
                  {addresses.length > 0 ? (
                    <Select
                      value={addressId}
                      onChange={setChosenAddressId}
                      options={[
                        ...addresses.map((address) => ({
                          value: String(address.id),
                          label: `${address.recipientName} - ${address.detail}, ${address.district}, ${address.city}`,
                        })),
                        { value: "", label: "Nhập địa chỉ khác..." },
                      ]}
                    />
                  ) : (
                    <TextInput
                      value={manualAddress}
                      onChange={setManualAddress}
                      placeholder="Số nhà, phường, quận, tỉnh"
                    />
                  )}
                </Field>
                {addresses.length > 0 && addressId === "" && (
                  <TextInput
                    value={manualAddress}
                    onChange={setManualAddress}
                    placeholder="Số nhà, phường, quận, tỉnh"
                  />
                )}
                <p className="text-xs text-slate-500">
                  Quản lý sổ địa chỉ tại{" "}
                  <Link
                    href="/account"
                    className="text-teal-800 hover:underline"
                  >
                    trang tài khoản
                  </Link>
                  .
                </p>
                <Field label="Phương thức thanh toán">
                  <Select
                    value={paymentMethod}
                    onChange={(value) =>
                      setPaymentMethod(value as PaymentMethod)
                    }
                    options={PAYMENT_METHODS.map((method) => ({
                      value: method.value,
                      label: method.label,
                    }))}
                  />
                </Field>
                <Field label="Mã giảm giá">
                  <TextInput
                    value={voucherCode}
                    onChange={setVoucherCode}
                    placeholder="VD: NHOM14"
                  />
                </Field>
                {vouchers.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {vouchers.map((voucher) => (
                      <button
                        key={voucher.id}
                        type="button"
                        onClick={() => setVoucherCode(voucher.code)}
                        title={`Giảm ${voucher.discountPercent}% cho đơn từ ${formatCurrency(
                          voucher.minimumOrderAmount,
                        )}`}
                      >
                        <Badge tone="warning">
                          {voucher.code} -{voucher.discountPercent}%
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card title="Tổng đơn hàng">
              <div className="space-y-1 text-sm">
                <p className="flex justify-between">
                  <span className="text-slate-600">Tạm tính</span>
                  <span>{formatCurrency(subtotal)}</span>
                </p>
                {estimatedDiscount > 0 && (
                  <p className="flex justify-between text-teal-800">
                    <span>Giảm giá dự kiến</span>
                    <span>-{formatCurrency(estimatedDiscount)}</span>
                  </p>
                )}
                <p className="flex justify-between border-t border-stone-200 pt-2 text-base font-semibold">
                  <span>Tổng cộng</span>
                  <span>{formatCurrency(subtotal - estimatedDiscount)}</span>
                </p>
              </div>
              <Button
                className="mt-4 w-full"
                onClick={checkout}
                disabled={placing}
              >
                {placing ? "Đang đặt hàng..." : "Đặt hàng"}
              </Button>
              <p className="mt-3 text-center text-xs text-slate-400">
                Giá chốt đơn được tính lại theo khuyến mãi tại thời điểm đặt
                hàng.
              </p>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
