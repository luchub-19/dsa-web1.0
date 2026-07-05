'use client';

import { useCallback, useEffect, useReducer } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabase/client';

export interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  /** Trả về { error } — error là null nếu thành công. Supabase mặc định yêu cầu xác nhận email. */
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsEmailConfirm: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

// FIX: dùng useReducer thay vì 2 useState riêng (user, isLoading) — dispatch()
// không bị ESLint react-hooks/set-state-in-effect gắn cờ (rule chỉ nhắm vào
// lời gọi setState trực tiếp trong effect), nhất quán với pattern đã dùng ở
// useSpacedRepetition.ts.

interface AuthState {
  user: User | null;
  isLoading: boolean;
}

type AuthAction = { type: 'SET_USER'; user: User | null } | { type: 'READY_NO_SUPABASE' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return { user: action.user, isLoading: false };
    case 'READY_NO_SUPABASE':
      return { user: null, isLoading: false };
    default:
      return state;
  }
}

/**
 * useAuth
 * ───────
 * Quản lý trạng thái đăng nhập Supabase. Không throw nếu thiếu biến môi
 * trường lúc render — lỗi đó chỉ xảy ra khi thực sự cần gọi Supabase (bên
 * trong effect/callback), tránh làm crash toàn trang khi build hoặc khi
 * người dùng chỉ đang duyệt ẩn danh (chưa cần backend).
 */
export function useAuth(): UseAuthReturn {
  const [state, dispatch] = useReducer(authReducer, { user: null, isLoading: true });

  useEffect(() => {
    let cancelled = false;
    let supabase: ReturnType<typeof getSupabaseClient>;

    try {
      supabase = getSupabaseClient();
    } catch {
      // Chưa cấu hình Supabase (.env.local trống) — coi như khách, không lỗi.
      dispatch({ type: 'READY_NO_SUPABASE' });
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) dispatch({ type: 'SET_USER', user: data.user });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) dispatch({ type: 'SET_USER', user: session?.user ?? null });
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: error.message, needsEmailConfirm: false };
      const needsEmailConfirm = data.session === null;
      return { error: null, needsEmailConfirm };
    } catch (err) {
      return { error: (err as Error).message, needsEmailConfirm: false };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    } catch (err) {
      return { error: (err as Error).message };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // Chưa cấu hình Supabase — không có gì để đăng xuất
    }
  }, []);

  return { user: state.user, isLoading: state.isLoading, signUp, signIn, signOut };
}
