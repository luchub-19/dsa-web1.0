'use client';

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase dùng chung toàn app — kiến trúc app này 100% Client
 * Component (không có Server Component nào cần session), nên chỉ cần 1
 * client browser đơn giản, không cần bộ @supabase/ssr phức tạp cho cookie
 * phía server.
 *
 * Session được supabase-js tự lưu vào localStorage (khác key với
 * dsa_sm2_store_v1, không đụng nhau) và tự động refresh token.
 */

let cached: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Tạo file .env.local theo mẫu .env.example và điền thông tin dự án Supabase.'
    );
  }

  cached = createSupabaseClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return cached;
}
