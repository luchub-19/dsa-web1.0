import 'server-only';

/**
 * rateLimit
 * ─────────
 * Giới hạn tốc độ gọi API theo IP, lưu trong bộ nhớ (in-memory) — không cần
 * thêm Redis/database cho 1 dự án quy mô lớp học.
 *
 * GIỚI HẠN CẦN BIẾT: nếu deploy trên nền tảng serverless nhiều instance
 * (Vercel Functions ở scale lớn), mỗi instance giữ bộ đếm RIÊNG — người
 * dùng có thể vô tình/cố ý "né" giới hạn nếu request rơi vào các instance
 * khác nhau. Với quy mô 1 lớp học (vài chục người dùng đồng thời), đây vẫn
 * là lớp phòng vệ hợp lý và tốt hơn hẳn việc không giới hạn gì cả. Nếu sau
 * này scale lớn hơn, nên chuyển bộ đếm sang Supabase (1 bảng đếm) hoặc
 * Upstash Redis để đảm bảo giới hạn đúng across mọi instance.
 */

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

// Dọn dẹp bucket cũ mỗi 5 phút để tránh rò rỉ bộ nhớ khi chạy lâu dài.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupIfNeeded(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets.entries()) {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
    if (bucket.timestamps.length === 0) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Kiểm tra + ghi nhận 1 lượt gọi cho `key` (thường là địa chỉ IP).
 * Sliding window: tối đa `limit` lượt trong `windowMs` mili-giây.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  cleanupIfNeeded(windowMs);

  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0];
    buckets.set(key, bucket);
    return { allowed: false, remaining: 0, retryAfterMs: windowMs - (now - oldest) };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return { allowed: true, remaining: limit - bucket.timestamps.length, retryAfterMs: 0 };
}

/** Lấy địa chỉ IP người gọi từ NextRequest, xử lý cả trường hợp qua proxy/CDN (Vercel). */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}
