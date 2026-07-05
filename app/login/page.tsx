'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black tracking-tight">
            Study<span className="text-indigo-400">OS</span>
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1">
            {mode === 'signin' ? 'Đăng nhập để đồng bộ tiến độ' : 'Tạo tài khoản mới'}
          </p>
        </div>

        {confirmNotice ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-3">
            <p className="text-2xl" aria-hidden="true">📧</p>
            <p className="text-sm text-emerald-300 font-semibold">Kiểm tra email của bạn</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mình đã gửi link xác nhận tới <strong className="text-slate-200">{email}</strong>.
              Bấm vào link đó rồi quay lại đăng nhập.
            </p>
            <button
              type="button"
              onClick={() => { setConfirmNotice(false); setMode('signin'); }}
              className="text-xs font-mono text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
            >
              ← Quay lại đăng nhập
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-mono text-slate-500 mb-1.5 uppercase tracking-widest">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5
                  text-sm text-slate-200 outline-none focus:border-indigo-500/60 focus:ring-1
                  focus:ring-indigo-500/40 transition-all duration-150"
                placeholder="ban@vidu.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-mono text-slate-500 mb-1.5 uppercase tracking-widest">
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
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5
                  text-sm text-slate-200 outline-none focus:border-indigo-500/60 focus:ring-1
                  focus:ring-indigo-500/40 transition-all duration-150"
                placeholder="Ít nhất 6 ký tự"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-5 py-2.5 rounded-lg text-sm font-semibold border
                bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500
                shadow-lg shadow-indigo-900/40 transition-all duration-150 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              {submitting ? 'Đang xử lý…' : mode === 'signin' ? 'Đăng nhập' : 'Đăng ký'}
            </button>

            <p className="text-center text-xs text-slate-500">
              {mode === 'signin' ? (
                <>
                  Chưa có tài khoản?{' '}
                  <button type="button" onClick={() => { setMode('signup'); setError(null); }}
                    className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                    Đăng ký
                  </button>
                </>
              ) : (
                <>
                  Đã có tài khoản?{' '}
                  <button type="button" onClick={() => { setMode('signin'); setError(null); }}
                    className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                    Đăng nhập
                  </button>
                </>
              )}
            </p>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="text-xs font-mono text-slate-600 hover:text-slate-400 transition-colors">
            ← Tiếp tục không cần đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
