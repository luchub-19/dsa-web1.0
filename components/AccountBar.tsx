'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';

/**
 * AccountBar
 * ──────────
 * Thanh nhỏ ở góc trên, hiện trên hầu hết các trang (đặt trong layout.tsx).
 *
 * FIX: trang /exam/[examId] (WhiteboardExam) dùng bố cục `h-screen` bắt đầu
 * ngay tại đỉnh viewport, không chừa khoảng trống cho thanh này — AccountBar
 * (fixed top-0) sẽ ĐÈ LÊN tiêu đề bài thi, nút Submit, đồng hồ đếm giờ.
 * Ngoài ra, về mặt trải nghiệm: phòng thi được thiết kế "không xao nhãng"
 * (chặn cả paste), nên có link "Đăng xuất" lơ lửng trên đầu trong lúc thi
 * cũng không hợp lý. => Ẩn hẳn AccountBar khi đang ở route /exam/*.
 */
export default function AccountBar() {
  const { user, isLoading, signOut } = useAuth();
  const pathname = usePathname();

  if (isLoading) return null;
  if (pathname?.startsWith('/exam/')) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-end gap-3
      px-4 py-1.5 text-[11px] font-mono bg-slate-950/80 backdrop-blur-sm border-b border-slate-900">
      {user ? (
        <>
          <span className="text-slate-500">
            {user.email} · <span className="text-emerald-400">đã đồng bộ</span>
          </span>
          <Link href="/settings" className="text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2">
            Cài đặt
          </Link>
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
          <Link href="/settings" className="text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2">
            Cài đặt
          </Link>
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
            Đăng nhập
          </Link>
        </>
      )}
    </div>
  );
}
