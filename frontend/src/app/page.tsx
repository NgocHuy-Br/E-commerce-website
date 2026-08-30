"use client";

import { useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function Home() {
  const [result, setResult] = useState("Chưa test");
  const [loading, setLoading] = useState(false);

  const testAuthPing = async () => {
    try {
      setLoading(true);
      setResult("Đang gọi API...");

      const res = await fetch(`${API_BASE_URL}/api/auth/ping`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        setResult(`❌ Lỗi HTTP ${res.status}`);
        return;
      }

      const text = await res.text();
      setResult(`✅ Thành công: ${text}`);
    } catch {
      setResult("❌ Không gọi được API Gateway (check service/gateway/cors)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 px-6">
        <h1 className="text-3xl font-bold">Nhom14 TMDT - Skeleton Check</h1>

        <p className="text-sm text-zinc-600">
          API Base URL: <b>{API_BASE_URL}</b>
        </p>

        <button
          onClick={testAuthPing}
          disabled={loading}
          className="rounded-lg bg-black px-5 py-3 text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Đang test..." : "Test Auth Ping"}
        </button>

        <div className="w-full rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm font-medium">Kết quả:</p>
          <p className="mt-2">{result}</p>
        </div>
      </main>
    </div>
  );
}