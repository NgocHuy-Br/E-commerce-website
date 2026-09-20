export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "0đ";
  return `${Number(amount).toLocaleString("vi-VN")}đ`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

/** Chuyển giá trị input datetime-local sang ISO để gửi cho backend. */
export function toIsoInstant(localValue: string): string {
  return new Date(localValue).toISOString();
}

export function defaultPromotionRange(): { startsAt: string; endsAt: string } {
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { startsAt: toLocalInput(now), endsAt: toLocalInput(end) };
}

function toLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}
