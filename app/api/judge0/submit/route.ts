import { NextRequest, NextResponse } from 'next/server';
import { judge0Submit } from '../../../../lib/judge0Server';

/**
 * POST /api/judge0/submit
 * Proxy phía server tới Judge0 — trình duyệt không bao giờ thấy
 * JUDGE0_URL/JUDGE0_KEY thật.
 */
export async function POST(req: NextRequest) {
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
