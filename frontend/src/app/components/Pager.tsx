"use client";

import { useState } from "react";
import { Button } from "./ui";

/** Phân trang phía trình duyệt; đổi resetKey (từ khoá, bộ lọc) thì quay về trang 1. */
export function usePaging<T>(items: T[], pageSize = 10, resetKey = "") {
  const [state, setState] = useState({ page: 1, key: resetKey });
  const requested = state.key === resetKey ? state.page : 1;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requested, pageCount);
  return {
    slice: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageCount,
    total: items.length,
    setPage: (next: number) => setState({ page: next, key: resetKey }),
  };
}

export function Pager({
  page,
  pageCount,
  total,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPage: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
      <span>
        Trang {page}/{pageCount} · {total} mục
      </span>
      <span className="flex gap-2">
        <Button variant="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ← Trước
        </Button>
        <Button variant="ghost" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
          Sau →
        </Button>
      </span>
    </div>
  );
}
