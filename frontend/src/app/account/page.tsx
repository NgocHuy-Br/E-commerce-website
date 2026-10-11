"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, RequireLogin } from "../components/ui";
import { useSession } from "../lib/session";

export default function AccountPage() {
  const router = useRouter();
  const { session, token } = useSession();

  useEffect(() => {
    if (session && token) {
      router.replace("/account/profile");
    }
  }, [router, session, token]);

  if (!token || !session) {
    return (
      <>
        <PageHeader title="Tài khoản" />
        <RequireLogin
          next="/account"
          message="Đăng nhập để quản lý tài khoản của bạn."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Tài khoản" />
    </>
  );
}
