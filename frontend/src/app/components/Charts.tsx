"use client";

/** Biểu đồ cột đơn giản bằng CSS, không cần thư viện. */
export function BarChart({
  data,
  format = (value: number) => String(value),
  barClass = "bg-teal-600",
}: {
  data: { label: string; value: number }[];
  format?: (value: number) => string;
  barClass?: string;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">Chưa có dữ liệu.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <div className="flex h-40 min-w-full items-end gap-1" role="img" aria-label="Biểu đồ cột">
        {data.map((item) => (
          <div
            key={item.label}
            className="flex h-full min-w-6 flex-1 flex-col justify-end"
            title={`${item.label}: ${format(item.value)}`}
          >
            <div
              className={`w-full rounded-t ${barClass}`}
              style={{ height: `${Math.max(item.value > 0 ? 3 : 0, (item.value / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex min-w-full gap-1">
        {data.map((item) => (
          <span key={item.label} className="min-w-6 flex-1 truncate text-center text-[10px] text-slate-500">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
