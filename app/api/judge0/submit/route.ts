import { NextRequest, NextResponse } from 'next/server';
import { judge0Submit } from '../../../../lib/judge0Server';
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimit';

// FIX: trước đây route này KHÔNG có giới hạn nào — bất kỳ ai (kể cả không
// đăng nhập, kể cả gọi thẳng bằng script bỏ qua giao diện) đều có thể spam
// submit liên tục, tốn quota Judge0 (đặc biệt nghiêm trọng nếu dùng key trả
// phí thay vì endpoint free mặc định). Giờ giới hạn theo IP: tối đa 10 lượt
// submit / 5 phút — đủ thoải mái cho 1 học sinh làm bài thi thật (vài lần
// thử lại), nhưng chặn được kiểu spam vô tội vạ.
const MAX_SUBMISSIONS = 10;
const WINDOW_MS = 5 * 60 * 1000;

/**
 * POST /api/judge0/submit
 * Proxy phía server tới Judge0 — trình duyệt không bao giờ thấy
 * JUDGE0_URL/JUDGE0_KEY thật.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed, retryAfterMs } = checkRateLimit(`judge0-submit:${ip}`, MAX_SUBMISSIONS, WINDOW_MS);

  if (!allowed) {
    return NextResponse.json(
      {
        error: `Bạn đã gửi bài quá nhiều lần trong thời gian ngắn. Thử lại sau ${Math.ceil(retryAfterMs / 1000)} giây.`,
      },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  try {
    const body = await req.json();

    if (!body?.source_code || !body?.language_id) {
      return NextResponse.json(
        { error: 'Thiếu source_code hoặc language_id' },
        { status: 400 }
      );
    }

    const MAX_SOURCE_LEN = 20_000;
    if (body.source_code.length > MAX_SOURCE_LEN) {
      return NextResponse.json({ error: 'Source code quá dài' }, { status: 413 });
    }

    const result = await judge0Submit(body);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? 'Unknown error' },
      { status: 502 }
    );
  }
}
