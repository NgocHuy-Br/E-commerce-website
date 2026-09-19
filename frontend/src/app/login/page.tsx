"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, Card, Field, TextInput } from "../components/ui";
import { api, errorMessage } from "../lib/api";
import { useSession } from "../lib/session";
import { useNotify } from "../lib/toast";
import type { AuthResponse } from "../lib/types";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useSession();
  const notify = useNotify();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const nextPath = searchParams.get("next") || "/";

  const submit = async () => {
    setLoading(true);
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const result = await api<AuthResponse>(path, { method: "POST", body: { email, password } });
      signIn(result);
      notify(
        `${mode === "login" ? "Đăng nhập" : "Đăng ký"} thành công: ${result.email}`,
        "success",
      );
      router.push(nextPath.startsWith("/login") ? "/" : nextPath);
    } catch (error) {
      notify(errorMessage(error, "Không thể xác thực tài khoản."), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-5 text-center">
        <h1 className="text-xl font-semibold">
          {mode === "login" ? "Đăng nhập" : "Tạo tài khoản mới"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Dùng tài khoản để mua hàng, mở cửa hàng và theo dõi đơn hàng.
        </p>
      </div>
      <Card>
        <div className="mb-5 flex gap-2 border-b border-stone-200 pb-3">
          <Button variant={mode === "login" ? "primary" : "ghost"} onClick={() => setMode("login")}>
            Đăng nhập
          </Button>
          <Button
            variant={mode === "register" ? "primary" : "ghost"}
            onClick={() => setMode("register")}
          >
            Đăng ký
          </Button>
        </div>

        <div className="space-y-3">
          <Field label="Email">
            <TextInput value={email} onChange={setEmail} placeholder="ban@example.com" />
          </Field>
          <Field label="Mật khẩu">
            <TextInput
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Ít nhất 6 ký tự"
              onEnter={submit}
            />
          </Field>
        </div>

        <Button className="mt-5 w-full" onClick={submit} disabled={loading}>
          {loading ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
        </Button>

        <p className="mt-4 text-center text-sm text-slate-500">
          {mode === "login" ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
          <button
            type="button"
            className="font-medium text-teal-800 hover:underline"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Đăng ký ngay" : "Đăng nhập"}
          </button>
        </p>

        <p className="mt-4 text-center text-xs text-slate-400">
          Tài khoản mới mặc định là người mua. Muốn bán hàng, hãy mở cửa hàng ở mục Người bán và chờ
          quản trị viên duyệt.
        </p>
      </Card>

      <p className="mt-4 text-center text-sm">
        <Link href="/" className="text-slate-500 hover:text-teal-800">
          ← Về trang chủ
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Card>Đang tải...</Card>}>
      <LoginForm />
    </Suspense>
  );
}
