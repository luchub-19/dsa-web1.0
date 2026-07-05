'use client';

import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';

/**
 * AccountBar
 * ──────────
 * Thanh nhỏ ở góc trên, hiện trên MỌI trang (đặt trong layout.tsx). Không
 * đụng tới bố cục riêng của từng trang (dashboard, learn, review đều đã có
 * header riêng) — đây chỉ là 1 dải mỏng cố định phía trên cùng.
 */
export default function AccountBar() {
  const { user, isLoading, signOut } = useAuth();

  if (isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-end gap-3
      px-4 py-1.5 text-[11px] font-mono bg-slate-950/80 backdrop-blur-sm border-b border-slate-900">
      {user ? (
        <>
          <span className="text-slate-500">
            {user.email} · <span className="text-emerald-400">đã đồng bộ</span>
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            className="text-slate-500 hover:text-red-400 transition-colors underline underline-offset-2"
          >
            Đăng xuất
          </button>
        </>
      ) : (
        <>
          <span className="text-slate-600">Chưa đăng nhập · dữ liệu chỉ lưu trên máy này</span>
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
            Đăng nhập
          </Link>
        </>
      )}
    </div>
  );
}
