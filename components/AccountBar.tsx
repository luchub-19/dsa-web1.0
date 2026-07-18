'use client';

import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';

/**
 * AccountBar
 * ──────────
 * Thanh nhỏ ở góc trên, hiện trên MỌI trang (đặt trong layout.tsx). Không
 * đụng tới bố cục riêng của từng trang (dashboard, learn, review đều đã có
 * header riêng) — đây chỉ là 1 dải mỏng cố định phía trên cùng.
 *
 * FIX (đi kèm đợt nâng cấp giao diện): /settings tồn tại và hoạt động
 * nhưng không được link từ bất kỳ đâu trong app — trước đây chỉ vào được
 * bằng cách gõ thẳng URL. Thêm 1 icon bánh răng nhỏ ở đây để trang có lối
 * vào thật sự.
 */
export default function AccountBar() {
  const { user, isLoading, signOut } = useAuth();

  if (isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-end gap-3
      px-4 py-1.5 text-[11px] font-mono bg-bg/80 backdrop-blur-sm border-b border-border">
      {user ? (
        <>
          <span className="text-ink-faint">
            {user.email} · <span className="text-success">đã đồng bộ</span>
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            className="text-ink-faint hover:text-danger transition-colors underline underline-offset-2"
          >
            Đăng xuất
          </button>
        </>
      ) : (
        <>
          <span className="text-ink-faint">Chưa đăng nhập · dữ liệu chỉ lưu trên máy này</span>
          <Link href="/login" className="text-signal hover:text-signal/80 underline underline-offset-2">
            Đăng nhập
          </Link>
        </>
      )}

      <Link
        href="/settings"
        aria-label="Cài đặt"
        className="text-ink-faint hover:text-ink-dim transition-colors flex items-center"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
            stroke="currentColor" strokeWidth="1.3"
          />
          <path
            d="M13 8.6v-1.2l-1.4-.3a4.3 4.3 0 0 0-.5-1.2l.8-1.2-.85-.85-1.2.8a4.3 4.3 0 0 0-1.2-.5L8.6 3H7.4l-.3 1.4a4.3 4.3 0 0 0-1.2.5l-1.2-.8-.85.85.8 1.2a4.3 4.3 0 0 0-.5 1.2L3 7.4v1.2l1.4.3c.1.43.27.83.5 1.2l-.8 1.2.85.85 1.2-.8c.37.23.77.4 1.2.5l.3 1.4h1.2l.3-1.4c.43-.1.83-.27 1.2-.5l1.2.8.85-.85-.8-1.2c.23-.37.4-.77.5-1.2l1.4-.3Z"
            stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"
          />
        </svg>
      </Link>
    </div>
  );
}
