"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "../lib/api";
import { useLoadEffect } from "../lib/hooks";
import { formatCurrency } from "../lib/format";
import type { Notify } from "../lib/session";
import type { Address, CartItem, Order, Voucher } from "../lib/types";
import { Badge, Button, Card, Empty, Field, Select, TextInput } from "./ui";

/** Giỏ hàng: sửa số lượng, chọn địa chỉ, áp mã giảm giá và đặt hàng. */
export function CartPanel({
  token,
  cart,
  addresses,
  onCartChange,
  onOrdered,
  notify,
}: {
  token: string | null;
  cart: CartItem[];
  addresses: Address[];
  onCartChange: (cart: CartItem[]) => void;
  onOrdered: (order: Order) => void;
  notify: Notify;
}) {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [voucherCode, setVoucherCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [chosenAddressId, setChosenAddressId] = useState<string | null>(null);
  const [manualAddress, setManualAddress] = useState("");
  const [placing, setPlacing] = useState(false);

  const loadVouchers = useCallback(async () => {
    setVouchers(
      await api<Voucher[]>("/api/orders/vouchers/active").catch(
        () => [] as Voucher[],
      ),
    );
  }, []);

  useLoadEffect(loadVouchers);

  // Mặc định chọn địa chỉ mặc định của người mua, tính ngay khi render thay vì dùng effect.
  const preferredAddress =
    addresses.find((address) => address.defaultAddress) ?? addresses[0];
  const addressId =
    chosenAddressId ?? (preferredAddress ? String(preferredAddress.id) : "");

  const subtotal = cart.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  );
  const selectedVoucher = vouchers.find(
    (voucher) => voucher.code === voucherCode.trim().toUpperCase(),
  );
  const estimatedDiscount =
    selectedVoucher && subtotal >= selectedVoucher.minimumOrderAmount
      ? Math.round((subtotal * selectedVoucher.discountPercent) / 100)
      : 0;

  const changeQuantity = async (item: CartItem, quantity: number) => {
    try {
      onCartChange(
        await api<CartItem[]>(
          `/api/orders/cart/items/${item.productId}?quantity=${quantity}`,
          {
            method: "PUT",
            token,
          },
        ),
      );
    } catch (error) {
      notify(errorMessage(error, "Không thể cập nhật giỏ hàng."), "error");
    }
  };

  const removeItem = async (item: CartItem) => {
    try {
      onCartChange(
        await api<CartItem[]>(`/api/orders/cart/items/${item.productId}`, {
          method: "DELETE",
          token,
        }),
      );
    } catch (error) {
      notify(errorMessage(error, "Không thể xoá sản phẩm."), "error");
    }
  };

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
      const order = await api<Order>("/api/orders/checkout", {
        method: "POST",
        token,
        body: {
          shippingAddress: address,
          paymentMethod,
          voucherCode: voucherCode.trim() || null,
        },
      });
      onCartChange([]);
      setVoucherCode("");
      onOrdered(order);
      notify(`Đặt hàng thành công. Mã đơn #${order.id}`, "success");
    } catch (error) {
      notify(errorMessage(error, "Không thể đặt hàng."), "error");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <Card title={`Giỏ hàng (${cart.length})`}>
      {cart.length === 0 ? (
        <Empty>Chưa có sản phẩm nào trong giỏ.</Empty>
      ) : (
        <div className="space-y-3">
          {cart.map((item) => (
            <div
              key={item.productId}
              className="border-b border-stone-100 pb-3 last:border-0"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{item.productName}</p>
                <button
                  type="button"
                  onClick={() => removeItem(item)}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Xoá
                </button>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm text-teal-800">
                  {formatCurrency(item.unitPrice)}
                  {item.discountPercent > 0 && (
                    <span className="ml-2 text-xs text-slate-400 line-through">
                      {formatCurrency(item.originalPrice)}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    className="px-2 py-1"
                    onClick={() => changeQuantity(item, item.quantity - 1)}
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
                    onClick={() => changeQuantity(item, item.quantity + 1)}
                  >
                    +
                  </Button>
                </span>
              </div>
            </div>
          ))}

          <div className="space-y-3 border-t border-stone-200 pt-3">
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
            <Field label="Phương thức thanh toán">
              <Select
                value={paymentMethod}
                onChange={setPaymentMethod}
                options={[
                  { value: "COD", label: "COD - thanh toán khi nhận hàng" },
                  {
                    value: "BANK_TRANSFER",
                    label: "Chuyển khoản (ghi nhận đã trả)",
                  },
                ]}
              />
            </Field>
            <Field label="Mã giảm giá">
              <TextInput
                value={voucherCode}
                onChange={setVoucherCode}
                placeholder="VD: SALE10"
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
              <p className="flex justify-between font-semibold">
                <span>Tổng cộng</span>
                <span>{formatCurrency(subtotal - estimatedDiscount)}</span>
              </p>
            </div>

            <Button className="w-full" onClick={checkout} disabled={placing}>
              {placing ? "Đang đặt hàng..." : "Đặt hàng"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
