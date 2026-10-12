"use client";

import { Button, Card } from "./components/ui";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <Card>
      <h1 className="text-lg font-semibold">Đã có lỗi xảy ra</h1>
      <p className="mt-2 text-sm text-slate-600">
        Trang không tải được. Hãy thử lại, nếu vẫn lỗi vui lòng quay lại sau.
      </p>
      <Button className="mt-4" onClick={retry}>
        Thử lại
      </Button>
    </Card>
  );
}
