"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordStrength } from "../components/PasswordStrength";
import { Button, Card, Field, TextInput } from "../components/ui";
import { api, errorMessage } from "../lib/api";
import { checkEmail, checkPassword } from "../lib/validate";
import { useNotify } from "../lib/toast";

/** Quên mật khẩu: nhận mã 6 số rồi đặt mật khẩu mới. */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const notify = useNotify();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestCode = async () => {
    const problem = checkEmail(email.trim());
    if (problem) {
      notify(problem, "error");
      return;
    }
    setLoading(true);
    try {
      const result = await api<{ message: string; resetCode: string | null }>("/api/auth/forgot-password", {
        method: "POST",
        body: { email: email.trim() },
      });
      setDevCode(result.resetCode);
      setStep("reset");
      notify(result.message, "info");
    } catch (error) {
      notify(errorMessage(error, "Không thể tạo mã xác nhận."), "error");
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    const problem = checkPassword(newPassword);
    if (problem) {
      notify(problem, "error");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      notify("Mã xác nhận gồm 6 chữ số.", "error");
      return;
    }
    setLoading(true);
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: { email: email.trim(), code, newPassword },
      });
      notify("Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.", "success");
      router.push("/login");
    } catch (error) {
      notify(errorMessage(error, "Không thể đặt lại mật khẩu."), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-5 text-center">
        <h1 className="text-xl font-semibold">Quên mật khẩu</h1>
        <p className="mt-1 text-sm text-slate-500">
          {step === "email"
            ? "Nhập email đã đăng ký để nhận mã xác nhận."
            : "Nhập mã xác nhận và mật khẩu mới."}
        </p>
      </div>
      <Card>
        <div className="space-y-3">
          <Field label="Email">
            <TextInput value={email} onChange={setEmail} placeholder="ban@example.com" onEnter={step === "email" ? requestCode : undefined} readOnly={step === "reset"} />
          </Field>
          {step === "reset" && (
            <>
              {devCode && (
                <p className="border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Chế độ phát triển (chưa có dịch vụ gửi email): mã xác nhận của bạn là <b>{devCode}</b>.
                </p>
              )}
              <Field label="Mã xác nhận (6 số)">
                <TextInput value={code} onChange={setCode} digitsOnly placeholder="123456" />
              </Field>
              <Field label="Mật khẩu mới">
                <TextInput type="password" value={newPassword} onChange={setNewPassword} showToggle placeholder="Ít nhất 6 ký tự" />
                <PasswordStrength value={newPassword} />
              </Field>
            </>
          )}
        </div>
        <Button className="mt-5 w-full" onClick={step === "email" ? requestCode : reset} disabled={loading}>
          {loading ? "Đang xử lý..." : step === "email" ? "Gửi mã xác nhận" : "Đặt lại mật khẩu"}
        </Button>
        {step === "reset" && (
          <button type="button" onClick={() => setStep("email")} className="mt-3 w-full text-center text-sm text-teal-800 hover:underline">
            Gửi lại mã
          </button>
        )}
      </Card>
      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="text-slate-500 hover:text-teal-800">
          ← Về trang đăng nhập
        </Link>
      </p>
    </div>
  );
}
