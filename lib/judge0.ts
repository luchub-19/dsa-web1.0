'use strict';

import type {
  ExamProblem,
  Judge0Result,
  Judge0StatusId,
  TestCaseResult,
  SubmissionState,
  TestVerdict,
} from '../types/exam';
import { JUDGE0_STATUS } from '../types/exam';

// ─── Configuration ─────────────────────────────────────────────────────────────
//
// TRƯỚC: gọi thẳng https://ce.judge0.com từ trình duyệt, key hard-code rỗng.
// SAU: gọi API route của chính domain (/api/judge0/*); route đó (server)
// mới thật sự nói chuyện với Judge0 dùng JUDGE0_URL/JUDGE0_KEY từ .env —
// xem lib/judge0Server.ts.

const API_BASE = '/api/judge0';

const POLL_INTERVAL_MS = 1_000;
const MAX_POLL_ATTEMPTS = 30;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function b64Encode(str: string): string {
  if (typeof window !== 'undefined') {
    return btoa(unescape(encodeURIComponent(str)));
  }
  return Buffer.from(str, 'utf-8').toString('base64');
}

function b64Decode(encoded: string | null): string {
  if (!encoded) return '';
  try {
    if (typeof window !== 'undefined') {
      return decodeURIComponent(escape(atob(encoded)));
    }
    return Buffer.from(encoded, 'base64').toString('utf-8');
  } catch {
    return encoded;
  }
}

function statusToVerdict(statusId: Judge0StatusId): TestVerdict {
  switch (statusId) {
    case JUDGE0_STATUS.ACCEPTED:
      return 'accepted';
    case JUDGE0_STATUS.WRONG_ANSWER:
      return 'wrong_answer';
    case JUDGE0_STATUS.TIME_LIMIT_EXCEEDED:
      return 'time_limit_exceeded';
    case JUDGE0_STATUS.COMPILATION_ERROR:
      return 'compilation_error';
    default:
      return 'runtime_error';
  }
}

// ─── Core API calls (tới API route riêng, không tới Judge0 trực tiếp) ─────────

async function submitOne(
  sourceCode: string,
  stdin: string,
  expectedOutput: string,
  languageId: number,
  timeLimitSec: number,
  memoryLimitMb: number,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch(`${API_BASE}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_code: b64Encode(sourceCode),
      language_id: languageId,
      stdin: b64Encode(stdin),
      expected_output: b64Encode(expectedOutput.trim()),
      cpu_time_limit: timeLimitSec,
      memory_limit: memoryLimitMb * 1024,
    }),
    signal,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? `Submit failed (${res.status})`);
  }
  return data.token;
}

async function pollResult(token: string, signal?: AbortSignal): Promise<Judge0Result> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    if (signal?.aborted) throw new Error('Submission cancelled');

    const res = await fetch(`${API_BASE}/${token}`, { signal });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error ?? `Poll failed (${res.status})`);
    }

    const sid = data.status?.id;
    if (sid !== JUDGE0_STATUS.IN_QUEUE && sid !== JUDGE0_STATUS.PROCESSING) {
      return data as Judge0Result;
    }
  }
  throw new Error('Judge0 timed out — no result after polling limit');
}

// ─── Public API (chữ ký không đổi — WhiteboardExam.tsx không cần sửa) ─────────

export interface GradeProgressCallback {
  onTestCaseDone: (index: number, result: TestCaseResult) => void;
}

export async function gradeSubmission(
  userCode: string,
  problem: ExamProblem,
  callbacks: GradeProgressCallback,
  signal?: AbortSignal
): Promise<SubmissionState> {
  const startWall = Date.now();

  let tokens: string[];
  try {
    const tokenPromises = problem.test_cases.map((tc) =>
      submitOne(
        userCode,
        tc.input,
        tc.expected_output,
        problem.language_id,
        problem.time_limit_seconds,
        problem.memory_limit_mb,
        signal
      )
    );
    tokens = await Promise.all(tokenPromises);
  } catch (err) {
    return {
      phase: 'error',
      test_results: [],
      compile_error: null,
      score: null,
      total_time_ms: null,
      error_message: `Submission failed: ${(err as Error).message}`,
    };
  }

  if (signal?.aborted) {
    return {
      phase: 'error',
      test_results: [],
      compile_error: null,
      score: null,
      total_time_ms: null,
      error_message: 'Submission cancelled',
    };
  }

  const results: TestCaseResult[] = new Array(problem.test_cases.length);
  let compileError: string | null = null;

  await Promise.all(
    tokens.map(async (token, idx) => {
      const tc = problem.test_cases[idx];
      let result: Judge0Result;

      try {
        result = await pollResult(token, signal);
      } catch (err) {
        const fallback: TestCaseResult = {
          label: tc.label,
          verdict: 'runtime_error',
          actual_output: null,
          expected_output: tc.expected_output,
          time_ms: null,
          memory_kb: null,
          hidden: tc.hidden ?? false,
          status_desc: (err as Error).message,
        };
        results[idx] = fallback;
        callbacks.onTestCaseDone(idx, fallback);
        return;
      }

      if (signal?.aborted) return;

      const verdict = statusToVerdict(result.status.id);
      const actualRaw = b64Decode(result.stdout);
      const compileRaw = b64Decode(result.compile_output);

      if (verdict === 'compilation_error' && compileRaw && !compileError) {
        compileError = compileRaw;
      }

      const tcResult: TestCaseResult = {
        label: tc.label,
        verdict,
        actual_output: actualRaw.trim() || null,
        expected_output: tc.expected_output.trim(),
        time_ms: result.time ? Math.round(parseFloat(result.time) * 1000) : null,
        memory_kb: result.memory,
        hidden: tc.hidden ?? false,
        status_desc: result.status.description,
      };

      results[idx] = tcResult;
      callbacks.onTestCaseDone(idx, tcResult);
    })
  );

  const total = results.length;
  const passed = results.filter((r) => r.verdict === 'accepted').length;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;
  const totalTimeMs = Date.now() - startWall;

  return {
    phase: 'done',
    test_results: results,
    compile_error: compileError,
    score,
    total_time_ms: totalTimeMs,
    error_message: null,
  };
}

/** Health-check qua route riêng thay vì gọi thẳng Judge0 */
export async function checkJudge0Health(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/submit`, { method: 'OPTIONS' });
    return res.status < 500;
  } catch {
    return false;
  }
}
