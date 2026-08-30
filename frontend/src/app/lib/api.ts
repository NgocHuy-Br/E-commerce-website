export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export async function pingAuth() {
  const res = await fetch(`${API_BASE_URL}/api/auth/ping`, { cache: "no-store" });
  if (!res.ok) throw new Error("Ping auth failed");
  return res.text();
}