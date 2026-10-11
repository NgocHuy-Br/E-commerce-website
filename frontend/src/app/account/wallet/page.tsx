"use client";

import { useState } from "react";
import { Button, Card, Field, Modal, PageHeader, RequireLogin, Select, TextInput } from "../../components/ui";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { createDefaultWallet } from "../../lib/mock";
import { useSession } from "../../lib/session";
import { useNotify } from "../../lib/toast";

export default function WalletPage() {
  const { session, token } = useSession();
  const notify = useNotify();
  const [wallet, setWallet] = useState(() => createDefaultWallet());
  const [topupAmount, setTopupAmount] = useState("500000");
  const [withdrawAmount, setWithdrawAmount] = useState("200000");
  const [transactionFilter, setTransactionFilter] = useState("ALL");
  const [walletModal, setWalletModal] = useState<"TOPUP" | "WITHDRAW" | null>(null);

  const walletTransactions = wallet.transactions.filter((transaction) =>
    transactionFilter === "ALL" ? true : transaction.type === transactionFilter,
  );

  const processTopup = () => {
    const amount = Number(topupAmount || 0);
    if (amount <= 0) {
      notify("Số tiền nạp phải lớn hơn 0.", "error");
      return;
    }

    const now = new Date().toISOString();
    const entry = {
      id: Date.now(),
      type: "TOPUP" as const,
      amount,
      status: "COMPLETED" as const,
      method: "VNPAY_MOCK",
      note: "Mô phỏng nạp tiền vào ví",
      createdAt: now,
    };

    setWallet((current) => ({
      ...current,
      balance: current.balance + amount,
      transactions: [entry, ...current.transactions],
    }));
    setTopupAmount("500000");
    setWalletModal(null);
    notify(`Đã nạp ${formatCurrency(amount)} vào ví.`, "success");
  };

  const processWithdraw = () => {
    const amount = Number(withdrawAmount || 0);
    if (amount <= 0) {
      notify("Số tiền rút phải lớn hơn 0.", "error");
      return;
    }

    const now = new Date().toISOString();
    const entry = {
      id: Date.now(),
      type: "WITHDRAW" as const,
      amount: -amount,
      status: "PENDING" as const,
      method: "BANK_TRANSFER_MOCK",
      note: "Mô phỏng yêu cầu rút tiền",
      createdAt: now,
    };

    setWallet((current) => ({
      ...current,
      balance: Math.max(0, current.balance - amount),
      pendingWithdraw: current.pendingWithdraw + amount,
      transactions: [entry, ...current.transactions],
    }));
    setWithdrawAmount("200000");
    setWalletModal(null);
    notify(`Yêu cầu rút ${formatCurrency(amount)} đã được ghi nhận.`, "success");
  };

  if (!token || !session) {
    return (
      <>
        <PageHeader title="Ví của tôi" />
        <RequireLogin next="/account/wallet" message="Đăng nhập để quản lý ví của bạn." />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Ví của tôi" />
      <div className="space-y-5">
        {walletModal && (
          <Modal
            title={walletModal === "TOPUP" ? "Nạp tiền vào ví" : "Yêu cầu rút tiền"}
            onClose={() => setWalletModal(null)}
          >
            <div className="space-y-3">
              <Field label={walletModal === "TOPUP" ? "Số tiền muốn nạp" : "Số tiền muốn rút"}>
                <TextInput
                  type="number"
                  value={walletModal === "TOPUP" ? topupAmount : withdrawAmount}
                  onChange={(value) => (walletModal === "TOPUP" ? setTopupAmount(value) : setWithdrawAmount(value))}
                  digitsOnly
                />
              </Field>
              <Field label="Phương thức">
                <Select
                  value={walletModal === "TOPUP" ? "VNPAY_MOCK" : "BANK_TRANSFER_MOCK"}
                  onChange={() => {}}
                  options={[
                    { value: "VNPAY_MOCK", label: "VNPay mock" },
                    { value: "MOMO_MOCK", label: "MoMo mock" },
                    { value: "BANK_TRANSFER_MOCK", label: "Chuyển khoản mock" },
                  ]}
                />
              </Field>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" onClick={() => setWalletModal(null)}>
                  Huỷ
                </Button>
                <Button onClick={walletModal === "TOPUP" ? processTopup : processWithdraw}>
                  {walletModal === "TOPUP" ? "Xác nhận nạp" : "Gửi yêu cầu rút"}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        <Card title="Tổng quan">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded border border-teal-200 bg-teal-50 p-4">
              <p className="text-xs uppercase tracking-wide text-teal-700">Số dư hiện tại</p>
              <p className="mt-2 text-2xl font-semibold text-teal-900">{formatCurrency(wallet.balance)}</p>
              <p className="mt-1 text-xs text-slate-500">Đang chờ rút: {formatCurrency(wallet.pendingWithdraw)}</p>
            </div>
            <div className="rounded border border-stone-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Nạp tiền</p>
              <TextInput value={topupAmount} onChange={setTopupAmount} digitsOnly />
              <Button className="mt-3 w-full" onClick={() => setWalletModal("TOPUP")}>
                Nạp tiền
              </Button>
            </div>
            <div className="rounded border border-stone-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Rút tiền</p>
              <TextInput value={withdrawAmount} onChange={setWithdrawAmount} digitsOnly />
              <Button className="mt-3 w-full" variant="secondary" onClick={() => setWalletModal("WITHDRAW")}>
                Rút tiền
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Lịch sử giao dịch">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="w-52">
              <Select
                value={transactionFilter}
                onChange={setTransactionFilter}
                options={[
                  { value: "ALL", label: "Tất cả" },
                  { value: "TOPUP", label: "Nạp tiền" },
                  { value: "WITHDRAW", label: "Rút tiền" },
                  { value: "ORDER_PAYMENT", label: "Thanh toán đơn" },
                  { value: "SELLER_SETTLEMENT", label: "Doanh thu" },
                ]}
              />
            </div>
          </div>

          <div className="space-y-2">
            {walletTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2 last:border-0"
              >
                <div>
                  <p className="font-medium">{transaction.note}</p>
                  <p className="text-xs text-slate-500">
                    {transaction.type} · {transaction.method} · {formatDateTime(transaction.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${transaction.amount >= 0 ? "text-teal-700" : "text-rose-600"}`}>
                    {transaction.amount >= 0 ? "+" : "-"}
                    {formatCurrency(Math.abs(transaction.amount))}
                  </p>
                  <p className="text-xs text-slate-500">{transaction.status}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
