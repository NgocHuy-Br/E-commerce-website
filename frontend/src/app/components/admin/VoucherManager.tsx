"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useLoadEffect } from "../../lib/hooks";
import {
  defaultPromotionRange,
  formatCurrency,
  formatDateTime,
  toIsoInstant,
} from "../../lib/format";
import type { Notify } from "../../lib/session";
import type { Voucher } from "../../lib/types";
import { Button, Card, Empty, Field, TextInput } from "../ui";

/** Quản lý mã giảm giá của nền tảng. */
export function VoucherManager({
  token,
  notify,
}: {
  token: string | null;
  notify: Notify;
}) {
  const range = defaultPromotionRange();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [code, setCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState("10");
  const [minimumOrderAmount, setMinimumOrderAmount] = useState("0");
  const [remainingUses, setRemainingUses] = useState("100");
  const [startsAt, setStartsAt] = useState(range.startsAt);
  const [endsAt, setEndsAt] = useState(range.endsAt);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setVouchers(await api<Voucher[]>("/api/orders/vouchers", { token }));
    } catch (error) {
      notify(errorMessage(error, "Không thể tải mã giảm giá."), "error");
    }
  }, [token, notify]);

  useLoadEffect(load);

  const create = async () => {
    try {
      await api("/api/orders/vouchers", {
        method: "POST",
        token,
        body: {
          code,
          discountPercent: Number(discountPercent),
          minimumOrderAmount: Number(minimumOrderAmount),
          remainingUses: Number(remainingUses),
          startsAt: toIsoInstant(startsAt),
          endsAt: toIsoInstant(endsAt),
        },
      });
      notify(`Đã tạo mã ${code.toUpperCase()}.`, "success");
      setCode("");
      await load();
    } catch (error) {
      notify(errorMessage(error, "Không thể tạo mã giảm giá."), "error");
    }
  };

  const remove = async (voucher: Voucher) => {
    try {
      await api(`/api/orders/vouchers/${voucher.id}`, {
        method: "DELETE",
        token,
      });
      notify(`Đã xoá mã ${voucher.code}.`, "success");
      await load();
    } catch (error) {
      notify(errorMessage(error, "Không thể xoá mã giảm giá."), "error");
    }
  };

  return (
    <Card title={`Mã giảm giá (${vouchers.length})`}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Mã">
          <TextInput value={code} onChange={setCode} placeholder="SALE10" />
        </Field>
        <Field label="Giảm (%)">
          <TextInput
            type="number"
            value={discountPercent}
            onChange={setDiscountPercent}
          />
        </Field>
        <Field label="Đơn tối thiểu (đ)">
          <TextInput
            type="number"
            value={minimumOrderAmount}
            onChange={setMinimumOrderAmount}
          />
        </Field>
        <Field label="Số lượt dùng">
          <TextInput
            type="number"
            value={remainingUses}
            onChange={setRemainingUses}
          />
        </Field>
        <Field label="Bắt đầu">
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            className="w-full border border-stone-300 bg-white px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Kết thúc">
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className="w-full border border-stone-300 bg-white px-3 py-2 text-sm"
          />
        </Field>
      </div>
      <Button className="mt-4" onClick={create}>
        Tạo mã giảm giá
      </Button>

      {vouchers.length === 0 ? (
        <Empty>Chưa có mã giảm giá nào.</Empty>
      ) : (
        <ul className="mt-4 space-y-2 text-sm">
          {vouchers.map((voucher) => (
            <li
              key={voucher.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2 last:border-0"
            >
              <span>
                <b>{voucher.code}</b> · giảm {voucher.discountPercent}% · đơn từ{" "}
                {formatCurrency(voucher.minimumOrderAmount)} · còn{" "}
                {voucher.remainingUses} lượt ·{" "}
                {formatDateTime(voucher.startsAt)} →{" "}
                {formatDateTime(voucher.endsAt)}
              </span>
              <Button variant="danger" onClick={() => remove(voucher)}>
                Xoá
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
