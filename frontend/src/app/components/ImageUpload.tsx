"use client";

import { useRef, useState } from "react";

export function ImageUpload({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn một tệp ảnh.");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      const result = (await response.json()) as { url?: string; message?: string };
      if (!response.ok || !result.url) {
        throw new Error(result.message ?? "Không thể tải ảnh lên.");
      }
      onChange(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải ảnh lên.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden border border-stone-200 bg-stone-100 text-center text-xs text-slate-400">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="h-full w-full object-cover" />
          ) : (
            "Chưa có ảnh"
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(event) => upload(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="border border-stone-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-stone-100 disabled:opacity-50"
          >
            {uploading ? "Đang tải..." : value ? "Thay ảnh" : "Tải ảnh lên"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
            >
              Xoá ảnh
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP hoặc GIF · tối đa 5 MB</p>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
