import { NextRequest, NextResponse } from 'next/server';
import { judge0Poll } from '../../../../lib/judge0Server';
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimit';

/**
 * GET /api/judge0/:token
 * Trình duyệt gọi lặp lại (mỗi 1s) để lấy trạng thái chấm bài.
 *
 * RATE LIMIT: lib/judge0.ts poll với POLL_INTERVAL_MS=1000, tối đa
 * MAX_POLL_ATTEMPTS=30 lần MỖI test case, và các test case của cùng 1 lượt
 * nộp bài poll gần như đồng thời (cùng bắt đầu). Với ~10 test case, 1 lượt
 * nộp bài có thể tạo tới ~300 request loại này trong 60s — đặt limit đúng
 * mức đó để không chặn nhầm polling hợp lệ, chỉ chặn khi có bất thường
 * (spam thủ công / đoán token).
 */
const POLL_LIMIT = 300;
const POLL_WINDOW_MS = 60_000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const ip = getClientIp(req);
  const { allowed, retryAfterMs } = checkRateLimit(`judge0:poll:${ip}`, POLL_LIMIT, POLL_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Đang có quá nhiều yêu cầu kiểm tra kết quả, vui lòng thử lại sau ít giây.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: 'Thiếu token' }, { status: 400 });
    }
    const result = await judge0Poll(token);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? 'Unknown error' },
      { status: 502 }
    );
  }
}
