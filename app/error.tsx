'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * error.tsx
 * ─────────
 * FIX: trước đây KHÔNG có error boundary nào ở cấp route — nếu 1 component
 * bất kỳ (ví dụ ActiveRecallBlock, WhiteboardExam) throw lỗi runtime, cả
 * trang trắng xóa, người dùng không biết chuyện gì xảy ra và không có cách
 * nào thử lại ngoài F5.
 *
 * BẮT BUỘC là Client Component theo quy ước Next.js App Router. Next.js tự
 * động bọc file này quanh nội dung `app/` — không cần cấu hình gì thêm.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log lỗi ra console để debug — trong thực tế nên gửi lên dịch vụ
    // theo dõi lỗi (Sentry, LogRocket...) thay vì chỉ console.error.
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg text-ink flex items-center justify-center px-6">
      <div className="text-center space-y-5 max-w-md">
        <p className="text-6xl" aria-hidden="true">⚠️</p>
        <h1 className="text-2xl font-bold text-ink">Đã có lỗi xảy ra</h1>
        <p className="text-sm text-ink-faint font-mono leading-relaxed">
          Một phần của trang gặp sự cố không mong muốn. Bạn có thể thử lại,
          hoặc quay về trang chủ nếu lỗi vẫn tiếp diễn.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="text-left text-xs text-danger/80 bg-danger/[0.06] border border-danger/25
            rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
            {error.message}
          </pre>
        )}
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-5 py-2.5 rounded-lg border border-signal bg-signal
              hover:bg-signal/90 text-bg text-sm font-semibold transition-colors duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            Thử lại
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-lg border border-border-strong bg-surface
              hover:bg-surface-hover text-ink text-sm font-semibold transition-colors duration-150"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
