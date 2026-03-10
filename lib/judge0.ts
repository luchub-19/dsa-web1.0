'use strict';

import type {
  ExamProblem,
  Judge0SubmissionRequest,
  Judge0SubmissionResponse,
  Judge0Result,
  Judge0StatusId,
  TestCaseResult,
  SubmissionState,
  TestVerdict,
} from '../types/exam';
import { JUDGE0_STATUS } from '../types/exam';

// ─── Configuration ─────────────────────────────────────────────────────────────

/**
 * Judge0 CE (Community Edition) endpoint.
 *
 * Options:
 *  A) Self-hosted:   http://localhost:2358
 *  B) RapidAPI free: https://judge0-ce.p.rapidapi.com
 *
 * Set NEXT_PUBLIC_JUDGE0_URL in .env.local
 * Set NEXT_PUBLIC_JUDGE0_KEY for RapidAPI key (leave blank for self-hosted)
 */
const JUDGE0_BASE = 'https://ce.judge0.com';
const JUDGE0_KEY = '';

/** Polling interval in ms */
const POLL_INTERVAL_MS = 1_000;
/** Max polling attempts before giving up */
const MAX_POLL_ATTEMPTS = 30;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function b64Encode(str: string): string {
  if (typeof window !== 'undefined') {
    // Browser
    return btoa(unescape(encodeURIComponent(str)));
  }
  // Node (Next.js server actions / route handlers)
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
    return encoded; // already decoded (some Judge0 instances skip encoding)
  }
}

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
      // All runtime error variants
      return 'runtime_error';
  }
}

// ─── Core API calls ────────────────────────────────────────────────────────────

/**
 * Submit one test case to Judge0.
 * Returns the submission token.
 */
async function submitOne(
  sourceCode: string,
  stdin: string,
  expectedOutput: string,
  languageId: number,
  timeLimitSec: number,
  memoryLimitMb: number
): Promise<string> {
  const body: Judge0SubmissionRequest = {
    source_code: b64Encode(sourceCode),
    language_id: languageId,
    stdin: b64Encode(stdin),
    expected_output: b64Encode(expectedOutput.trim()),
    cpu_time_limit: timeLimitSec,
    memory_limit: memoryLimitMb * 1024, // MB → KB
  };

  const res = await fetch(`${JUDGE0_BASE}/submissions?base64_encoded=true&wait=false`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Judge0 submit failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as Judge0SubmissionResponse;
  return data.token;
}

/**
 * Poll Judge0 until a submission leaves the queue / processing states.
 * Throws after MAX_POLL_ATTEMPTS.
 */
async function pollResult(token: string): Promise<Judge0Result> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const res = await fetch(
      `${JUDGE0_BASE}/submissions/${token}?base64_encoded=true`,
      { headers: buildHeaders() }
    );

    if (!res.ok) {
      throw new Error(`Judge0 poll failed (${res.status})`);
    }

    const data = (await res.json()) as Judge0Result;
    const sid = data.status.id;

    if (sid !== JUDGE0_STATUS.IN_QUEUE && sid !== JUDGE0_STATUS.PROCESSING) {
      return data;
    }
  }

  throw new Error('Judge0 timed out — no result after polling limit');
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface GradeProgressCallback {
  /** Called as each test case finishes (0-based index) */
  onTestCaseDone: (index: number, result: TestCaseResult) => void;
}

/**
 * Grade all test cases in `problem` against `userCode`.
 *
 * Submits all test cases in parallel, then polls each result.
 * Calls `onTestCaseDone` incrementally so the UI can update live.
 *
 * Returns the final SubmissionState (phase='done' or 'error').
 */
export async function gradeSubmission(
  userCode: string,
  problem: ExamProblem,
  callbacks: GradeProgressCallback,
  signal?: AbortSignal
): Promise<SubmissionState> {
  const startWall = Date.now();

  // ── Step 1: Submit all test cases simultaneously ──────────────
  let tokens: string[];
  try {
    const tokenPromises = problem.test_cases.map((tc) =>
      submitOne(
        userCode,
        tc.input,
        tc.expected_output,
        problem.language_id,
        problem.time_limit_seconds,
        problem.memory_limit_mb
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

  // ── Step 2: Poll each result ──────────────────────────────────
  const results: TestCaseResult[] = new Array(problem.test_cases.length);
  let compileError: string | null = null;

  await Promise.all(
    tokens.map(async (token, idx) => {
      const tc = problem.test_cases[idx];
      let result: Judge0Result;

      try {
        result = await pollResult(token);
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

  // ── Step 3: Compute score ─────────────────────────────────────
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

/**
 * Returns true if Judge0 is reachable.
 * Used for a health-check before the exam starts.
 */
export async function checkJudge0Health(): Promise<boolean> {
  try {
    const res = await fetch(`${JUDGE0_BASE}/system_info`, {
      headers: buildHeaders(),
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
