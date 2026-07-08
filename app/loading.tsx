/**
 * loading.tsx
 * ───────────
 * FIX: trước đây KHÔNG có file này — Next.js không có gì để hiện trong lúc
 * chuyển trang/tải dữ liệu ở cấp route, có thể gây cảm giác "đứng hình"
 * trong khoảnh khắc chuyển route. File này theo quy ước App Router, tự
 * động dùng làm fallback (React Suspense) cho toàn bộ `app/`.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
