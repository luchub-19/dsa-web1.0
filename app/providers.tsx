'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Providers
 * ─────────
 * QueryClient được tạo bên trong useState (không phải module-scope) để mỗi
 * request SSR / mỗi phiên trình duyệt có 1 instance riêng — tránh rò rỉ
 * cache giữa các người dùng khác nhau khi chạy trên server (Next.js App
 * Router có thể share module scope giữa các request).
 *
 * defaultOptions: dữ liệu SM-2/exam trong app này chỉ đổi qua hành động của
 * chính người dùng (không có nguồn ghi ngoài), nên không cần refetch nền
 * theo window focus — tránh gọi Supabase thừa.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: Infinity,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
