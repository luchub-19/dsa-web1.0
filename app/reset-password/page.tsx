'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Button } from '../../components/ui/Button';

/**
 * /reset-password
 * ────────────────
 * Trang đích của link "Quên mật khẩu" trong email. Supabase tự đọc token
 * khôi phục từ URL (hash fragment) lúc load trang và thiết lập 1 session
 * tạm — useAuth() (qua onAuthStateChange, xem hooks/useAuth.ts) sẽ thấy
 * `user` khác null ngay sau đó. Không cần tự parse URL thủ công ở đây.
 *
 * Cũng hoạt động đúng nếu người dùng đã đăng nhập sẵn và vào thẳng trang
 * này — session thường cũng đủ điều kiện để updateUser({password}), nên
 * trang này tiện thể đóng luôn vai trò "đổi mật khẩu" cho tài khoản đang
 * đăng nhập, dù mục đích chính vẫn là khôi phục sau khi quên.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const { user, isLoading, updatePassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Hai mật khẩu bạn nhập không khớp.');
      return;
    }

    setSubmitting(true);
    const { error } = await updatePassword(password);
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    setSuccess(true);
  }

  return (
    <div className="min-h-screen bg-bg text-ink flex items-center justify-center px-5 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-[0.07] bg-signal" />
        <div className="absolute inset-0 opacity-[0.03] grid-texture" />
      </div>

      <div className="relative w-full max-w-sm" style={{ animation: 'fadeUp 0.4s ease-out both' }}>
        <div className="text-center mb-8">
          <h1 className="font-mono text-2xl font-bold tracking-tight text-ink">
            Study<span className="text-signal">OS</span>
          </h1>
          <Eyebrow className="mt-2">Đặt mật khẩu mới</Eyebrow>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-center">
            <p className="text-xs text-ink-dim">Đang kiểm tra link…</p>
          </div>
        ) : success ? (
          <div className="rounded-xl border border-success/30 bg-success/5 p-6 text-center space-y-3">
            <p className="text-2xl" aria-hidden="true">✅</p>
            <p className="text-sm text-success font-semibold">Đã đổi mật khẩu</p>
            <p className="text-xs text-ink-dim leading-relaxed">
              Mật khẩu mới của bạn đã được lưu. Dùng nó cho lần đăng nhập tiếp theo.
            </p>
            <Button variant="primary" className="w-full" onClick={() => router.push('/')}>
              Tiếp tục
            </Button>
          </div>
        ) : !user ? (
          <div className="rounded-xl border border-danger/30 bg-danger/5 p-6 text-center space-y-3">
            <p className="text-2xl" aria-hidden="true">⚠️</p>
            <p className="text-sm text-danger font-semibold">Link không hợp lệ hoặc đã hết hạn</p>
            <p className="text-xs text-ink-dim leading-relaxed">
              Link đặt lại mật khẩu chỉ dùng được 1 lần và hết hạn sau một khoảng thời gian ngắn.
              Yêu cầu 1 link mới rồi thử lại.
            </p>
            <Link
              href="/login"
              className="inline-block text-xs font-mono text-signal hover:text-signal/80 underline underline-offset-2"
            >
              ← Quay lại đăng nhập
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-surface p-6">
            <div>
              <label htmlFor="new-password" className="block text-xs font-mono text-ink-faint mb-1.5 uppercase tracking-widest">
                Mật khẩu mới
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-4 py-2.5
                  text-sm text-ink outline-none focus:border-signal/60 focus:ring-1
                  focus:ring-signal/40 transition-all duration-150"
                placeholder="Ít nhất 6 ký tự"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-xs font-mono text-ink-faint mb-1.5 uppercase tracking-widest">
                Nhập lại mật khẩu mới
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-4 py-2.5
                  text-sm text-ink outline-none focus:border-signal/60 focus:ring-1
                  focus:ring-signal/40 transition-all duration-150"
                placeholder="Gõ lại mật khẩu ở trên"
              />
            </div>

            {error && (
              <p className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" disabled={submitting} className="w-full">
              {submitting ? 'Đang lưu…' : 'Lưu mật khẩu mới'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
