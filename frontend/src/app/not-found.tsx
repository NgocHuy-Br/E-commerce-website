import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md border border-stone-200 bg-white p-8 text-center shadow-sm">
      <p className="text-5xl font-bold text-teal-700">404</p>
      <h1 className="mt-3 text-lg font-semibold">Không tìm thấy trang</h1>
      <p className="mt-2 text-sm text-slate-600">Đường dẫn không tồn tại hoặc đã bị di chuyển.</p>
      <Link href="/" className="mt-5 inline-block bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">
        Về trang chủ
      </Link>
    </div>
  );
}
