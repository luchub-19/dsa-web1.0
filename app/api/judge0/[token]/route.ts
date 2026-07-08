import { NextRequest, NextResponse } from 'next/server';
import { judge0Poll } from '../../../../lib/judge0Server';
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimit';

// Giới hạn nhẹ hơn nhiều so với /submit vì đây chỉ là polling trạng thái
// (rẻ hơn cho Judge0 so với 1 lần chấm bài thật). Vẫn cần giới hạn để chặn
// script spam vô hạn. Ước lượng: 1 lần thi có ~6-7 test case, mỗi cái poll
// tối đa 30 lần/giây-1 => tối đa ~210 lượt/phiên thi hợp lệ, nên đặt hạn mức
// rộng rãi hơn nhiều để không chặn nhầm người dùng thật.
const MAX_POLLS = 300;
const WINDOW_MS = 5 * 60 * 1000;

/**
 * GET /api/judge0/:token
 * Trình duyệt gọi lặp lại (mỗi 1s) để lấy trạng thái chấm bài.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const ip = getClientIp(req);
  const { allowed, retryAfterMs } = checkRateLimit(`judge0-poll:${ip}`, MAX_POLLS, WINDOW_MS);

  if (!allowed) {
    return NextResponse.json(
      { error: `Quá nhiều yêu cầu. Thử lại sau ${Math.ceil(retryAfterMs / 1000)} giây.` },
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
