'use strict';

// ─── Problem definition (comes from JSON data) ────────────────────────────────

export interface TestCase {
  /** stdin fed to the program */
  input: string;
  /** expected stdout */
  expected_output: string;
  /** shown to user in results — keep short */
  label: string;
  /** if true, test case details are hidden from user until after grading */
  hidden?: boolean;
}

export interface ExamProblem {
  id: string;
  title: string;
  /** Full problem statement — may contain HTML */
  description_html: string;
  /** Starter code shown in the editor */
  starter_code: string;
  /** Language name displayed in UI */
  language: string;
  /** Judge0 language_id: 54 = C++17, 52 = C++14 */
  language_id: number;
  /** Time limit in seconds */
  time_limit_seconds: number;
  /** Memory limit in MB */
  memory_limit_mb: number;
  test_cases: TestCase[];
  /** Optional grading rubric shown after submission */
  rubric?: string[];
}

// ─── Judge0 API shapes ────────────────────────────────────────────────────────

/** Status IDs returned by Judge0 */
export const JUDGE0_STATUS = {
  IN_QUEUE: 1,
  PROCESSING: 2,
  ACCEPTED: 3,
  WRONG_ANSWER: 4,
  TIME_LIMIT_EXCEEDED: 5,
  COMPILATION_ERROR: 6,
  RUNTIME_ERROR_SIGSEGV: 7,
  RUNTIME_ERROR_SIGXFSZ: 8,
  RUNTIME_ERROR_SIGFPE: 9,
  RUNTIME_ERROR_SIGABRT: 10,
  RUNTIME_ERROR_NZEC: 11,
  RUNTIME_ERROR_OTHER: 12,
  INTERNAL_ERROR: 13,
  EXEC_FORMAT_ERROR: 14,
} as const;

export type Judge0StatusId = typeof JUDGE0_STATUS[keyof typeof JUDGE0_STATUS];

export interface Judge0SubmissionRequest {
  source_code: string;         // base64-encoded
  language_id: number;
  stdin?: string;              // base64-encoded
  expected_output?: string;    // base64-encoded
  cpu_time_limit?: number;
  memory_limit?: number;       // KB
}

export interface Judge0SubmissionResponse {
  token: string;
}

export interface Judge0Result {
  token: string;
  status: { id: Judge0StatusId; description: string };
  stdout: string | null;       // base64
  stderr: string | null;       // base64
  compile_output: string | null; // base64
  message: string | null;
  time: string | null;         // seconds as string e.g. "0.003"
  memory: number | null;       // KB
}

// ─── Internal grading state ───────────────────────────────────────────────────

export type TestVerdict =
  | 'pending'
  | 'running'
  | 'accepted'
  | 'wrong_answer'
  | 'time_limit_exceeded'
  | 'runtime_error'
  | 'compilation_error';

export interface TestCaseResult {
  label: string;
  verdict: TestVerdict;
  /** Actual output from the program (may be trimmed for display) */
  actual_output: string | null;
  expected_output: string;
  /** Wall time in ms */
  time_ms: number | null;
  memory_kb: number | null;
  hidden: boolean;
  /** Raw Judge0 status description */
  status_desc: string;
}

export type SubmissionPhase =
  | 'idle'
  | 'submitting'   // waiting for Judge0 queue token
  | 'judging'      // polling results
  | 'done'
  | 'error';

export interface SubmissionState {
  phase: SubmissionPhase;
  test_results: TestCaseResult[];
  compile_error: string | null;
  /** 0–100 */
  score: number | null;
  total_time_ms: number | null;
  error_message: string | null;
}
