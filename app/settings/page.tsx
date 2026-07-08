'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useSpacedRepetition } from '../../hooks/useSpacedRepetition';

/**
 * SettingsPage
 * ────────────
 * FIX: trước đây hook useSpacedRepetition đã có sẵn resetCard()/resetAll()
 * nhưng KHÔNG có màn hình nào trong app gọi tới — người dùng muốn học lại
 * từ đầu không có cách nào làm được qua giao diện. Trang này lấp khoảng
 * trống đó, kèm bước xác nhận rõ ràng vì đây là hành động không thể hoàn tác.
 */
export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { allCards, resetAll, isLoading } = useSpacedRepetition();

  const [confirmText, setConfirmText] = useState('');
  const [resetDone, setResetDone] = useState(false);

  const stats = useMemo(() => {
    const cards = Object.values(allCards);
    return {
      total: cards.length,
      reviewed: cards.filter((c) => c.total_reviews > 0).length,
      totalReviews: cards.reduce((sum, c) => sum + c.total_reviews, 0),
    };
  }, [allCards]);

  const CONFIRM_WORD = 'XOA';
  const canReset = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  function handleReset() {
    if (!canReset) return;
    resetAll();
    setResetDone(true);
    setConfirmText('');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-5 pt-16 pb-24">
      <div className="max-w-lg mx-auto space-y-8">

        <header className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-indigo-400/60">Cài đặt</p>
            <h1 className="text-xl font-bold text-slate-100 mt-0.5">Tài khoản &amp; Dữ liệu</h1>
          </div>
          <Link href="/" className="font-mono text-xs text-slate-600 hover:text-slate-400 transition-colors">
            ← Home
          </Link>
        </header>

        {/* Trạng thái tài khoản */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-600">Tài khoản</p>
          {user ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-200">{user.email}</p>
                <p className="text-xs text-emerald-400 font-mono mt-0.5">Đã đồng bộ với Supabase</p>
              </div>
              <button
                type="button"
                onClick={() => signOut()}
                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800
                  hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">Chưa đăng nhập — dữ liệu chỉ lưu trên máy này.</p>
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg border border-indigo-500/50 bg-indigo-600/20
                  hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold transition-colors"
              >
                Đăng nhập
              </Link>
            </div>
          )}
        </section>

        {/* Thống kê học tập */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-600 mb-4">
            Thống kê học tập
          </p>
          {isLoading ? (
            <p className="text-xs text-slate-600 font-mono">Đang tải…</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-black text-indigo-300 tabular-nums">{stats.total}</p>
                <p className="text-[10px] font-mono text-slate-600 mt-1">Thẻ đã tạo</p>
              </div>
              <div>
                <p className="text-2xl font-black text-cyan-300 tabular-nums">{stats.reviewed}</p>
                <p className="text-[10px] font-mono text-slate-600 mt-1">Đã ôn ≥1 lần</p>
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-300 tabular-nums">{stats.totalReviews}</p>
                <p className="text-[10px] font-mono text-slate-600 mt-1">Lượt ôn tổng</p>
              </div>
            </div>
          )}
        </section>

        {/* Vùng nguy hiểm */}
        <section className="rounded-xl border border-red-500/25 bg-red-500/5 p-5 space-y-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-red-400/80">
              Vùng nguy hiểm
            </p>
            <p className="text-sm text-slate-300 mt-1">Đặt lại toàn bộ tiến độ học tập</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Xóa vĩnh viễn toàn bộ lịch sử ôn tập SM-2 (kể cả trên Supabase nếu đã đăng nhập).
              Bài học vẫn còn nguyên, nhưng bạn sẽ bắt đầu lại từ đầu như chưa từng học.
              <strong className="text-red-300"> Không thể hoàn tác.</strong>
            </p>
          </div>

          {resetDone ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-emerald-300">✓ Đã đặt lại toàn bộ tiến độ.</p>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="text-xs font-mono text-emerald-400 underline underline-offset-2"
              >
                Về trang chủ
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="confirm" className="block text-xs text-slate-400">
                Gõ <code className="px-1.5 py-0.5 rounded bg-slate-800 text-red-300 font-mono">{CONFIRM_WORD}</code> để xác nhận:
              </label>
              <div className="flex gap-2">
                <input
                  id="confirm"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={CONFIRM_WORD}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2
                    text-sm text-slate-200 font-mono outline-none focus:border-red-500/50
                    focus:ring-1 focus:ring-red-500/30"
                />
                <button
                  type="button"
                  disabled={!canReset}
                  onClick={handleReset}
                  className={[
                    'px-4 py-2 rounded-lg text-sm font-semibold border whitespace-nowrap transition-all duration-150',
                    canReset
                      ? 'border-red-500 bg-red-600 hover:bg-red-500 text-white active:scale-95'
                      : 'border-slate-700 bg-slate-800/50 text-slate-600 cursor-not-allowed',
                  ].join(' ')}
                >
                  Xóa toàn bộ
                </button>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
