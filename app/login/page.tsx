'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Button } from '../../components/ui/Button';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmNotice, setConfirmNotice] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      setSubmitting(false);
      if (error) {
        setError(error);
        return;
      }
      router.push('/');
      return;
    }

    // signup
    const { error, needsEmailConfirm } = await signUp(email, password);
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    if (needsEmailConfirm) {
      setConfirmNotice(true);
    } else {
      router.push('/');
    }
  }

  return (
    <div className="min-h-screen bg-bg text-ink flex items-center justify-center px-5 relative overflow-hidden">
      {/* Ambient background — quieter echo of the dashboard's hero, since
          this is a utility screen, not a place to spend the design's
          full budget of attention. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-[0.07] bg-signal" />
        <div className="absolute inset-0 opacity-[0.03] grid-texture" />
      </div>

      <div className="relative w-full max-w-sm" style={{ animation: 'fadeUp 0.4s ease-out both' }}>
        <div className="text-center mb-8">
          <h1 className="font-mono text-2xl font-bold tracking-tight text-ink">
            Study<span className="text-signal">OS</span>
          </h1>
          <Eyebrow className="mt-2">
            {mode === 'signin' ? 'Đăng nhập để đồng bộ tiến độ' : 'Tạo tài khoản mới'}
          </Eyebrow>
        </div>

        {confirmNotice ? (
          <div className="rounded-xl border border-success/30 bg-success/5 p-6 text-center space-y-3">
            <p className="text-2xl" aria-hidden="true">📧</p>
            <p className="text-sm text-success font-semibold">Kiểm tra email của bạn</p>
            <p className="text-xs text-ink-dim leading-relaxed">
              Mình đã gửi link xác nhận tới <strong className="text-ink">{email}</strong>.
              Bấm vào link đó rồi quay lại đăng nhập.
            </p>
            <button
              type="button"
              onClick={() => { setConfirmNotice(false); setMode('signin'); }}
              className="text-xs font-mono text-signal hover:text-signal/80 underline underline-offset-2"
            >
              ← Quay lại đăng nhập
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-surface p-6">
            <div>
              <label htmlFor="email" className="block text-xs font-mono text-ink-faint mb-1.5 uppercase tracking-widest">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-4 py-2.5
                  text-sm text-ink outline-none focus:border-signal/60 focus:ring-1
                  focus:ring-signal/40 transition-all duration-150"
                placeholder="ban@vidu.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-mono text-ink-faint mb-1.5 uppercase tracking-widest">
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-4 py-2.5
                  text-sm text-ink outline-none focus:border-signal/60 focus:ring-1
                  focus:ring-signal/40 transition-all duration-150"
                placeholder="Ít nhất 6 ký tự"
              />
            </div>

            {error && (
              <p className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" disabled={submitting} className="w-full">
              {submitting ? 'Đang xử lý…' : mode === 'signin' ? 'Đăng nhập' : 'Đăng ký'}
            </Button>

            <p className="text-center text-xs text-ink-dim">
              {mode === 'signin' ? (
                <>
                  Chưa có tài khoản?{' '}
                  <button type="button" onClick={() => { setMode('signup'); setError(null); }}
                    className="text-signal hover:text-signal/80 underline underline-offset-2">
                    Đăng ký
                  </button>
                </>
              ) : (
                <>
                  Đã có tài khoản?{' '}
                  <button type="button" onClick={() => { setMode('signin'); setError(null); }}
                    className="text-signal hover:text-signal/80 underline underline-offset-2">
                    Đăng nhập
                  </button>
                </>
              )}
            </p>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="text-xs font-mono text-ink-faint hover:text-ink-dim transition-colors">
            ← Tiếp tục không cần đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
