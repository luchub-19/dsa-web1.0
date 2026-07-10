import { NextRequest, NextResponse } from 'next/server';
import { judge0Poll } from '../../../../lib/judge0Server';

/**
 * GET /api/judge0/:token
 * Trình duyệt gọi lặp lại (mỗi 1s) để lấy trạng thái chấm bài.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
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
