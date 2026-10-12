"use client";

import { PageHeader, RequireLogin } from "../../components/ui";
import { ProfilePanel } from "../../components/buyer/ProfilePanel";
import { useSession } from "../../lib/session";

export default function AccountProfilePage() {
  const { token, session } = useSession();

  if (!token || !session) {
    return (
      <>
        <PageHeader title="Thông tin cá nhân" back={false} />
        <RequireLogin
          next="/account/profile"
          message="Đăng nhập để xem và chỉnh sửa thông tin cá nhân."
        />
      </>
    );
  }

  return (
    <>
      <ProfilePanel />
    </>
  );
}
