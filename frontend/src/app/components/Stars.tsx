"use client";

/** Hiển thị điểm sao trung bình (chỉ đọc) hoặc cho phép chọn số sao. */
export function Stars({
  rating,
  count,
  onSelect,
}: {
  rating: number;
  count?: number;
  onSelect?: (value: number) => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="text-amber-500">
        {[1, 2, 3, 4, 5].map((star) =>
          onSelect ? (
            <button
              key={star}
              type="button"
              onClick={() => onSelect(star)}
              className="px-0.5 text-base leading-none"
              aria-label={`Chọn ${star} sao`}
            >
              {star <= rating ? "★" : "☆"}
            </button>
          ) : (
            <span key={star}>{star <= Math.round(rating) ? "★" : "☆"}</span>
          ),
        )}
      </span>
      {count !== undefined && (
        <span className="text-xs text-slate-500">
          {count > 0 ? `${rating.toFixed(1)} (${count})` : "chưa có đánh giá"}
        </span>
      )}
    </span>
  );
}
