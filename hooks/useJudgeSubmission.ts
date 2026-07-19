'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { gradeSubmission } from '../lib/judge0';
import type { ExamProblem, SubmissionState, TestCaseResult } from '../types/exam';

/**
 * useJudgeSubmission
 * ──────────────────
 * TRƯỚC: toàn bộ state machine chấm bài (reducer, AbortController, timer bắt
 * đầu, gọi gradeSubmission) sống trực tiếp trong WhiteboardExam.tsx — 1 file
 * 850 dòng vừa lo UI vừa lo logic mạng/Judge0.
 *
 * SAU: hook này CHỈ chịu trách nhiệm nộp bài + theo dõi tiến trình chấm.
 * Component chỉ còn việc render dựa trên state trả về. Chữ ký giữ tối giản
 * (nhận `problem`, trả state + 2 hành động) để dễ test độc lập không cần DOM.
 */

// ─── Reducer (giữ nguyên logic, chỉ chuyển vị trí) ─────────────────────────────

type SubmissionAction =
  | { type: 'START_SUBMIT' }
  | { type: 'START_JUDGE'; total: number }
  | { type: 'TEST_DONE'; index: number; result: TestCaseResult }
  | { type: 'FINISH'; state: SubmissionState }
  | { type: 'ERROR'; message: string }
  | { type: 'RESET' };

function makeInitialResults(n: number): TestCaseResult[] {
  return Array.from({ length: n }, (_, i) => ({
    label: `Test ${i + 1}`,
    verdict: 'pending' as const,
    actual_output: null,
    expected_output: '',
    time_ms: null,
    memory_kb: null,
    hidden: false,
    status_desc: 'Waiting…',
  }));
}

function submissionReducer(
  state: SubmissionState,
  action: SubmissionAction
): SubmissionState {
  switch (action.type) {
    case 'START_SUBMIT':
      return {
        phase: 'submitting',
        test_results: [],
        compile_error: null,
        score: null,
        total_time_ms: null,
        error_message: null,
      };
    case 'START_JUDGE':
      return {
        ...state,
        phase: 'judging',
        test_results: makeInitialResults(action.total),
      };
    case 'TEST_DONE': {
      const updated = [...state.test_results];
      updated[action.index] = action.result;
      return { ...state, test_results: updated };
    }
    case 'FINISH':
      return { ...action.state, phase: 'done' };
    case 'ERROR':
      return {
        ...state,
        phase: 'error',
        error_message: action.message,
      };
    case 'RESET':
      return {
        phase: 'idle',
        test_results: [],
        compile_error: null,
        score: null,
        total_time_ms: null,
        error_message: null,
      };
    default:
      return state;
  }
}

const initialSubmissionState: SubmissionState = {
  phase: 'idle',
  test_results: [],
  compile_error: null,
  score: null,
  total_time_ms: null,
  error_message: null,
};

// ─── Hook ──────────────────────────────────────────────────────────────────────

export interface UseJudgeSubmissionReturn {
  submission: SubmissionState;
  /** Timestamp (Date.now()) lúc bắt đầu nộp bài gần nhất — dùng cho LiveTimer. */
  submitStartedAt: number | null;
  isRunning: boolean;
  passedCount: number;
  totalCount: number;
  submit: (code: string) => Promise<void>;
  reset: () => void;
}

export function useJudgeSubmission(
  problem: ExamProblem,
  onExamComplete?: (state: SubmissionState, code: string) => void
): UseJudgeSubmissionReturn {
  const [submission, dispatch] = useReducer(submissionReducer, initialSubmissionState);
  const abortRef = useRef<AbortController | null>(null);

  // FIX (giữ nguyên từ bản gốc): giá trị này ảnh hưởng render (LiveTimer) nên
  // phải là state, không phải ref — đổi ref.current không kích hoạt re-render.
  const [submitStartedAt, setSubmitStartedAt] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const submit = useCallback(
    async (code: string) => {
      if (submission.phase === 'submitting' || submission.phase === 'judging') return;
      if (!code.trim()) return;

      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setSubmitStartedAt(Date.now());

      dispatch({ type: 'START_SUBMIT' });

      // Tiny delay so React flushes the UI before async work begins
      await new Promise((r) => setTimeout(r, 50));

      dispatch({ type: 'START_JUDGE', total: problem.test_cases.length });

      const finalState = await gradeSubmission(
        code,
        problem,
        {
          onTestCaseDone: (idx, result) => {
            dispatch({ type: 'TEST_DONE', index: idx, result });
          },
        },
        abortRef.current.signal
      );

      if (finalState.phase === 'error') {
        dispatch({ type: 'ERROR', message: finalState.error_message ?? 'Unknown error' });
      } else {
        dispatch({ type: 'FINISH', state: finalState });
        onExamComplete?.(finalState, code);
      }
    },
    [problem, submission.phase, onExamComplete]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: 'RESET' });
  }, []);

  const isRunning = submission.phase === 'submitting' || submission.phase === 'judging';
  const passedCount = submission.test_results.filter((r) => r.verdict === 'accepted').length;
  const totalCount = submission.test_results.length;

  return {
    submission,
    submitStartedAt,
    isRunning,
    passedCount,
    totalCount,
    submit,
    reset,
  };
}
