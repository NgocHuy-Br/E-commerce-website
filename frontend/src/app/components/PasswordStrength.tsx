"use client";

/** Đánh giá độ mạnh mật khẩu để gợi ý người dùng; không thay thế kiểm tra phía máy chủ. */
export function passwordStrength(value: string): { score: number; label: string } {
  if (!value) return { score: 0, label: "" };
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  const capped = Math.min(score, 4);
  const labels = ["Rất yếu", "Yếu", "Trung bình", "Khá mạnh", "Mạnh"];
  return { score: capped, label: labels[capped] };
}

export function PasswordStrength({ value }: { value: string }) {
  const { score, label } = passwordStrength(value);
  if (!value) return null;
  const colors = ["bg-rose-500", "bg-rose-400", "bg-amber-400", "bg-emerald-400", "bg-emerald-600"];
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded ${index < Math.max(score, 1) ? colors[score] : "bg-stone-200"}`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Độ mạnh: {label}. Nên dùng từ 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
      </p>
    </div>
  );
}
