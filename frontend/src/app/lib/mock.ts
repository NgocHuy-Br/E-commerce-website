import type { Wallet } from "./types";

export const WALLET_STORAGE_KEY = "nm14-wallet";

export function soldCountForProduct(productId: number): number {
  const value = (productId * 17 + 29) % 63;
  return 3 + value;
}

export function createDefaultWallet(): Wallet {
  return {
    balance: 2500000,
    currency: "VND",
    pendingWithdraw: 0,
    transactions: [
      {
        id: 1,
        type: "TOPUP",
        amount: 2500000,
        status: "COMPLETED",
        method: "VNPAY_MOCK",
        note: "Nạp tiền mua hàng",
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        type: "ORDER_PAYMENT",
        amount: -380000,
        status: "COMPLETED",
        method: "WALLET",
        note: "Thanh toán đơn hàng #1201",
        createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      },
      {
        id: 3,
        type: "SELLER_SETTLEMENT",
        amount: 650000,
        status: "COMPLETED",
        method: "WALLET",
        note: "Doanh thu từ đơn hàng đã giao",
        createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
    ],
  };
}

export function readWallet(): Wallet {
  if (typeof window === "undefined") {
    return createDefaultWallet();
  }
  try {
    const raw = window.localStorage.getItem(WALLET_STORAGE_KEY);
    if (!raw) {
      return createDefaultWallet();
    }
    const parsed = JSON.parse(raw) as Wallet;
    return {
      ...createDefaultWallet(),
      ...parsed,
      transactions: parsed.transactions ?? createDefaultWallet().transactions,
    };
  } catch {
    return createDefaultWallet();
  }
}

export function writeWallet(wallet: Wallet) {
  if (typeof window === "undefined") {
    return wallet;
  }
  window.localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(wallet));
  return wallet;
}

export function chargeWallet(amount: number) {
  const wallet = readWallet();
  const nextBalance = wallet.balance - amount;
  const entry = {
    id: Date.now(),
    type: "ORDER_PAYMENT" as const,
    amount: -amount,
    status: "COMPLETED" as const,
    method: "WALLET",
    note: "Thanh toán đơn hàng bằng ví",
    createdAt: new Date().toISOString(),
  };
  const next = {
    ...wallet,
    balance: Math.max(0, nextBalance),
    transactions: [entry, ...wallet.transactions],
  };
  writeWallet(next);
  return next;
}

export function topupWallet(amount: number) {
  const wallet = readWallet();
  const entry = {
    id: Date.now(),
    type: "TOPUP" as const,
    amount,
    status: "COMPLETED" as const,
    method: "VNPAY_MOCK",
    note: "Mô phỏng nạp tiền vào ví",
    createdAt: new Date().toISOString(),
  };
  const next = {
    ...wallet,
    balance: wallet.balance + amount,
    transactions: [entry, ...wallet.transactions],
  };
  writeWallet(next);
  return next;
}

export function withdrawWallet(amount: number) {
  const wallet = readWallet();
  const entry = {
    id: Date.now(),
    type: "WITHDRAW" as const,
    amount: -amount,
    status: "PENDING" as const,
    method: "BANK_TRANSFER_MOCK",
    note: "Mô phỏng yêu cầu rút tiền",
    createdAt: new Date().toISOString(),
  };
  const next = {
    ...wallet,
    balance: Math.max(0, wallet.balance - amount),
    pendingWithdraw: wallet.pendingWithdraw + amount,
    transactions: [entry, ...wallet.transactions],
  };
  writeWallet(next);
  return next;
}
