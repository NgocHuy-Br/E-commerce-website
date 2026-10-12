"use client";

import { useCallback, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Modal,
  PageHeader,
  RequireLogin,
  Select,
  StatTile,
  TextInput,
} from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { useLoadEffect } from "../../lib/hooks";
import {
  WALLET_METHOD_LABELS,
  WALLET_STATUS_LABELS,
  WALLET_TYPE_LABELS,
  labelOf,
} from "../../lib/labels";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";
import type { Order, Wallet } from "../../lib/types";

const METHOD_OPTIONS = [
  { value: "VNPAY", label: "VNPay" },
  { value: "MOMO", label: "MoMo" },
  { value: "BANK_TRANSFER", label: "Chuyển khoản ngân hàng" },
];

export default function WalletPage() {
  const { session, token, hasRole } = useSession();
  const notify = useNotify();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [sellerOrders, setSellerOrders] = useState<Order[]>([]);
  const [topupAmount, setTopupAmount] = useState("500000");
  const [withdrawAmount, setWithdrawAmount] = useState("200000");
  const [method, setMethod] = useState("VNPAY");
  const [transactionFilter, setTransactionFilter] = useState("ALL");
  const [walletModal, setWalletModal] = useState<"TOPUP" | "WITHDRAW" | null>(null);
  const [sending, setSending] = useState(false);
  const isSeller = hasRole("SELLER");

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setWallet(await api<Wallet>("/api/orders/wallet", { token }));
      if (isSeller) {
        setSellerOrders(await api<Order[]>("/api/orders/seller", { token }).catch(() => [] as Order[]));
      }
    } catch (error) {
      notify(errorMessage(error, "Không thể tải ví."), "error");
    }
  }, [token, isSeller, notify]);

  useLoadEffect(load);

  const submit = async () => {
    if (!walletModal) return;
    const topup = walletModal === "TOPUP";
    const amount = Number(topup ? topupAmount : withdrawAmount);
    if (!Number.isFinite(amount) || amount < 10000) {
      notify("Số tiền tối thiểu là 10.000đ.", "error");
      return;
    }
    setSending(true);
    try {
      const next = await api<Wallet>(
        topup ? "/api/orders/wallet/topup" : "/api/orders/wallet/withdraw",
        { method: "POST", token, body: { amount, method } },
      );
      setWallet(next);
      setWalletModal(null);
      notify(
        topup
          ? `Đã nạp ${formatCurrency(amount)} vào ví.`
          : `Đã gửi yêu cầu rút ${formatCurrency(amount)}, chờ quản trị viên duyệt.`,
        "success",
      );
    } catch (error) {
      notify(errorMessage(error, "Không thể thực hiện giao dịch."), "error");
    } finally {
      setSending(false);
    }
  };

  if (!token || !session) {
    return (
      <>
        <PageHeader title="Ví của tôi" back={false} />
        <RequireLogin next="/account/wallet" message="Đăng nhập để quản lý ví của bạn." />
      </>
    );
  }

  const transactions = (wallet?.transactions ?? []).filter((transaction) =>
    transactionFilter === "ALL" ? true : transaction.type === transactionFilter,
  );

  // Đối soát người bán: tiền đã về ví so với tiền còn chờ giao xong.
  const settled = sellerOrders.filter((order) => order.status === "DELIVERED");
  const inProgress = sellerOrders.filter(
    (order) => order.status !== "DELIVERED" && order.status !== "CANCELLED",
  );
  const sum = (orders: Order[], pick: (order: Order) => number) =>
    orders.reduce((total, order) => total + pick(order), 0);

  return (
    <>
      <div className="space-y-5">
        {walletModal && (
          <Modal
            title={walletModal === "TOPUP" ? "Nạp tiền vào ví" : "Yêu cầu rút tiền"}
            onClose={() => setWalletModal(null)}
          >
            <div className="space-y-3">
              <Field label={walletModal === "TOPUP" ? "Số tiền muốn nạp (đ)" : "Số tiền muốn rút (đ)"}>
                <TextInput
                  value={walletModal === "TOPUP" ? topupAmount : withdrawAmount}
                  onChange={(value) => (walletModal === "TOPUP" ? setTopupAmount(value) : setWithdrawAmount(value))}
                  thousands
                />
              </Field>
              <Field label="Phương thức">
                <Select value={method} onChange={setMethod} options={METHOD_OPTIONS} />
              </Field>
              {walletModal === "WITHDRAW" && (
                <p className="text-xs text-slate-500">
                  Số tiền được giữ lại ngay và chỉ chuyển đi sau khi quản trị viên duyệt. Nếu bị từ chối, tiền được hoàn
                  về ví.
                </p>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" onClick={() => setWalletModal(null)}>
                  Huỷ
                </Button>
                <Button onClick={submit} disabled={sending}>
                  {sending ? "Đang xử lý..." : walletModal === "TOPUP" ? "Xác nhận nạp" : "Gửi yêu cầu rút"}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        <Card title="Tổng quan">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded border border-teal-200 bg-teal-50 p-4">
              <p className="text-xs uppercase tracking-wide text-teal-700">Số dư hiện tại</p>
              <p className="mt-2 text-2xl font-semibold text-teal-900">{formatCurrency(wallet?.balance ?? 0)}</p>
              <p className="mt-1 text-xs text-slate-500">Đang chờ rút: {formatCurrency(wallet?.pendingWithdraw ?? 0)}</p>
            </div>
            <div className="rounded border border-stone-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Nạp tiền</p>
              <TextInput value={topupAmount} onChange={setTopupAmount} thousands />
              <Button className="mt-3 w-full" onClick={() => setWalletModal("TOPUP")}>
                Nạp tiền
              </Button>
            </div>
            <div className="rounded border border-stone-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Rút tiền</p>
              <TextInput value={withdrawAmount} onChange={setWithdrawAmount} thousands />
              <Button className="mt-3 w-full" variant="secondary" onClick={() => setWalletModal("WITHDRAW")}>
                Rút tiền
              </Button>
            </div>
          </div>
        </Card>

        {isSeller && (
          <Card title="Đối soát bán hàng">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile label="Đã về ví (sau phí)" value={formatCurrency(sum(settled, (o) => o.sellerAmount))} />
              <StatTile label="Đang chờ giao xong" value={formatCurrency(sum(inProgress, (o) => o.sellerAmount))} />
              <StatTile label="Phí nền tảng đã trừ" value={formatCurrency(sum(settled, (o) => o.commissionAmount))} />
              <StatTile label="Đơn đã đối soát" value={settled.length} />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Doanh thu của mỗi đơn được cộng vào ví ngay khi đơn chuyển sang đã giao, sau khi trừ phí nền tảng.
            </p>
          </Card>
        )}

        <Card title="Lịch sử giao dịch">
          <div className="mb-3 w-52">
            <Select
              value={transactionFilter}
              onChange={setTransactionFilter}
              options={[
                { value: "ALL", label: "Tất cả" },
                { value: "TOPUP", label: "Nạp tiền" },
                { value: "WITHDRAW", label: "Rút tiền" },
                { value: "ORDER_PAYMENT", label: "Thanh toán đơn" },
                { value: "REFUND", label: "Hoàn tiền" },
                { value: "SELLER_SETTLEMENT", label: "Doanh thu" },
              ]}
            />
          </div>
          {transactions.length === 0 ? (
            <Empty>Chưa có giao dịch nào.</Empty>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium">{transaction.note ?? labelOf(WALLET_TYPE_LABELS, transaction.type)}</p>
                    <p className="text-xs text-slate-500">
                      {labelOf(WALLET_TYPE_LABELS, transaction.type)}
                      {transaction.method ? ` · ${labelOf(WALLET_METHOD_LABELS, transaction.method)}` : ""} ·{" "}
                      {formatDateTime(transaction.createdAt)}
                    </p>
                    {transaction.adminNote && (
                      <p className="text-xs text-rose-600">Ghi chú của quản trị viên: {transaction.adminNote}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${transaction.amount >= 0 ? "text-teal-700" : "text-rose-600"}`}>
                      {transaction.amount >= 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </p>
                    <Badge
                      tone={
                        transaction.status === "COMPLETED"
                          ? "success"
                          : transaction.status === "PENDING"
                            ? "warning"
                            : "danger"
                      }
                    >
                      {labelOf(WALLET_STATUS_LABELS, transaction.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
