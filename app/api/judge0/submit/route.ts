import { NextRequest, NextResponse } from 'next/server';
import { judge0Submit } from '../../../../lib/judge0Server';
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimit';

/**
 * POST /api/judge0/submit
 * Proxy phía server tới Judge0 — trình duyệt không bao giờ thấy
 * JUDGE0_URL/JUDGE0_KEY thật.
 *
 * RATE LIMIT: mỗi lần bấm "Nộp bài" ở WhiteboardExam bắn SONG SONG 1 request
 * tới đây cho mỗi test case (xem lib/judge0.ts → gradeSubmission, tokens =
 * Promise.all(test_cases.map(submitOne))). Đề hiện tại nhiều nhất ~7 test
 * case, cho dư lên 10. 30 req/60s ≈ 3 lượt nộp bài/phút/IP — thoải mái cho
 * việc sửa code rồi nộp lại, nhưng vẫn chặn được script spam (mỗi request ở
 * đây tốn 1 lượt chấm Judge0 thật, không phải thao tác miễn phí).
 */
const SUBMIT_LIMIT = 30;
const SUBMIT_WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed, retryAfterMs } = checkRateLimit(`judge0:submit:${ip}`, SUBMIT_LIMIT, SUBMIT_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Bạn gửi bài quá nhanh, vui lòng đợi một chút rồi thử lại.' },
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
