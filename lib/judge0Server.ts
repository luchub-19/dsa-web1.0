import 'server-only';

/**
 * judge0Server
 * ────────────
 * CHỈ được import từ route handler trong app/api/judge0/*. Gói `server-only`
 * khiến build LỖI NGAY nếu ai vô tình import file này từ Client Component —
 * chặn rò rỉ API key ra bundle phía trình duyệt.
 *
 * TRƯỚC: lib/judge0.ts gọi thẳng https://ce.judge0.com từ trình duyệt,
 * hard-code JUDGE0_KEY = '' — không đọc .env dù comment nói vậy.
 * SAU: route handler (server) gọi hàm ở đây; trình duyệt chỉ gọi
 * /api/judge0/* của chính domain mình.
 */

const JUDGE0_URL = process.env.JUDGE0_URL ?? 'https://ce.judge0.com';
const JUDGE0_KEY = process.env.JUDGE0_KEY ?? '';

function buildHeaders(): HeadersInit {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (JUDGE0_KEY) {
    h['X-RapidAPI-Key'] = JUDGE0_KEY;
    h['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
  }
  return h;
}

export interface Judge0SubmitPayload {
  source_code: string;
  language_id: number;
  stdin?: string;
  expected_output?: string;
  cpu_time_limit?: number;
  memory_limit?: number;
}

export async function judge0Submit(payload: Judge0SubmitPayload): Promise<{ token: string }> {
  const res = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=true&wait=false`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Judge0 submit failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function judge0Poll(token: string): Promise<unknown> {
  const res = await fetch(`${JUDGE0_URL}/submissions/${token}?base64_encoded=true`, {
    headers: buildHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Judge0 poll failed (${res.status})`);
  }
  return res.json();
}
