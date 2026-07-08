import Link from 'next/link';

/**
 * not-found.tsx
 * ─────────────
 * FIX: trước đây KHÔNG có file này — bất kỳ URL nào không khớp route nào
 * (gõ sai chính tả, link cũ đã xóa...) sẽ hiện trang 404 mặc định xấu xí
 * của Next.js, không khớp giao diện tối của app. File này theo đúng quy ước
 * App Router (`app/not-found.tsx`) nên Next.js tự động dùng cho MỌI route
 * không tồn tại, không cần khai báo gì thêm.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
      <div className="text-center space-y-5 max-w-sm">
        <p className="text-6xl" aria-hidden="true">🧭</p>
        <h1 className="text-2xl font-bold text-slate-100">Không tìm thấy trang</h1>
        <p className="text-sm text-slate-500 font-mono leading-relaxed">
          Đường dẫn này không tồn tại — có thể đã bị gõ sai, hoặc trang đã được di chuyển.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg
            border border-slate-700 bg-slate-800 hover:bg-slate-700
            text-slate-200 text-sm font-semibold transition-colors duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          ← Về trang chủ
        </Link>
      </div>
    </div>
  );
}
