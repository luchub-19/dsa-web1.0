'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useSpacedRepetition } from '../../hooks/useSpacedRepetition';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

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
    <div className="min-h-screen bg-bg text-ink px-5 pt-16 pb-24">
      <div className="max-w-lg mx-auto space-y-8">

        <header className="flex items-center justify-between">
          <div>
            <Eyebrow tone="signal">Cài đặt</Eyebrow>
            <h1 className="text-xl font-bold text-ink mt-0.5">Tài khoản &amp; Dữ liệu</h1>
          </div>
          <Link href="/" className="font-mono text-xs text-ink-faint hover:text-ink-dim transition-colors">
            ← Home
          </Link>
        </header>

        {/* Trạng thái tài khoản */}
        <Card className="p-5 space-y-3">
          <Eyebrow>Tài khoản</Eyebrow>
          {user ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ink">{user.email}</p>
                <p className="text-xs text-success font-mono mt-0.5">Đã đồng bộ với Supabase</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                Đăng xuất
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-xs text-ink-dim">Chưa đăng nhập — dữ liệu chỉ lưu trên máy này.</p>
              <Button variant="primary" size="sm" onClick={() => router.push('/login')}>
                Đăng nhập
              </Button>
            </div>
          )}
        </Card>

        {/* Thống kê học tập */}
        <Card className="p-5">
          <Eyebrow className="mb-4">Thống kê học tập</Eyebrow>
          {isLoading ? (
            <p className="text-xs text-ink-faint font-mono">Đang tải…</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="font-mono text-2xl font-bold text-signal tabular-nums">{stats.total}</p>
                <p className="text-[10px] font-mono text-ink-faint mt-1">Thẻ đã tạo</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-periwinkle tabular-nums">{stats.reviewed}</p>
                <p className="text-[10px] font-mono text-ink-faint mt-1">Đã ôn ≥1 lần</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-success tabular-nums">{stats.totalReviews}</p>
                <p className="text-[10px] font-mono text-ink-faint mt-1">Lượt ôn tổng</p>
              </div>
            </div>
          )}
        </Card>

        {/* Vùng nguy hiểm */}
        <Card tone="danger" className="p-5 space-y-4">
          <div>
            <Eyebrow tone="danger">Vùng nguy hiểm</Eyebrow>
            <p className="text-sm text-ink mt-1">Đặt lại toàn bộ tiến độ học tập</p>
            <p className="text-xs text-ink-dim mt-1 leading-relaxed">
              Xóa vĩnh viễn toàn bộ lịch sử ôn tập SM-2 (kể cả trên Supabase nếu đã đăng nhập).
              Bài học vẫn còn nguyên, nhưng bạn sẽ bắt đầu lại từ đầu như chưa từng học.
              <strong className="text-danger"> Không thể hoàn tác.</strong>
            </p>
          </div>

          {resetDone ? (
            <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-success">✓ Đã đặt lại toàn bộ tiến độ.</p>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="text-xs font-mono text-success underline underline-offset-2"
              >
                Về trang chủ
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="confirm" className="block text-xs text-ink-dim">
                Gõ <code className="px-1.5 py-0.5 rounded bg-surface-2 text-danger font-mono">{CONFIRM_WORD}</code> để xác nhận:
              </label>
              <div className="flex gap-2">
                <input
                  id="confirm"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={CONFIRM_WORD}
                  className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2
                    text-sm text-ink font-mono outline-none focus:border-danger/50
                    focus:ring-1 focus:ring-danger/30"
                />
                <Button variant="danger" disabled={!canReset} onClick={handleReset}>
                  Xóa toàn bộ
                </Button>
              </div>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
