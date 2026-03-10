'use client';

import { use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import WhiteboardExam from '../../../components/WhiteboardExam';
import type { ExamProblem } from '../../../types/exam';
import type { SubmissionState } from '../../../types/exam';

// ─── Static exam registries ───────────────────────────────────────────────────
//
// Import all known exam JSON files statically.
// Next.js cannot handle truly dynamic import() at runtime for local JSON in the
// App Router without a route handler; static imports bundled here is the correct
// pattern for a client component that receives examId via params.

import pointersExam from '../../../data/exam_pointers.json';

// Add future exam packs here:
// import stacksExam from '../../../data/exam_stacks.json';
// import treesExam   from '../../../data/exam_trees.json';

type ExamRegistry = Record<string, ExamProblem[]>;

const EXAM_REGISTRY: ExamRegistry = {
  pointers: pointersExam as ExamProblem[],
  // stacks: stacksExam as ExamProblem[],
  // trees:  treesExam  as ExamProblem[],
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ examId: string }>;
}

// ─── Page (Client Component) ──────────────────────────────────────────────────

/**
 * ExamPage
 * ────────
 * Reads `examId` from the dynamic route segment, looks up the corresponding
 * problem set in EXAM_REGISTRY, and renders the WhiteboardExam component with
 * the first problem (index 0).
 *
 * Being a Client Component ('use client') is required here because:
 *  1. useRouter() is client-only.
 *  2. WhiteboardExam contains textarea, clipboard, and Judge0 fetch logic —
 *     all of which are client-side concerns.
 *
 * `params` is a Promise in Next.js 15 App Router and must be unwrapped with
 * React.use() inside a Client Component (cannot use async/await here).
 */
export default function ExamPage({ params }: PageProps) {
  const router   = useRouter();
  const { examId } = use(params);

  // ── Resolve problem from registry ────────────────────────────────────────
  const problems = EXAM_REGISTRY[examId] ?? null;
  const problem  = problems?.[0] ?? null;   // always load the first problem

  // Memoised so the WhiteboardExam reference stays stable across renders
  const stableProblem = useMemo(() => problem, [problem]);

  // ── Unknown examId ────────────────────────────────────────────────────────
  if (!stableProblem) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-4xl" aria-hidden="true">🔍</p>
          <h1 className="text-xl font-bold text-slate-200 font-mono">
            Exam not found
          </h1>
          <p className="text-sm text-slate-500 font-mono">
            <code className="text-slate-400">examId: {examId}</code> không tồn tại
            trong registry.
          </p>
          <button
            type="button"
            onClick={() => router.push('/learn/pointers')}
            className="mt-4 px-5 py-2 rounded-lg border border-slate-700
              bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold
              transition-colors duration-150"
          >
            ← Quay lại bài học
          </button>
        </div>
      </div>
    );
  }

  // ── Submission callback ───────────────────────────────────────────────────

  function handleExamComplete(state: SubmissionState) {
    // In production: POST to /api/exam/submit with userId + examId + state
    // For now: log and optionally redirect to a results page
    console.info('[ExamPage] Submission complete', {
      examId,
      problemId: stableProblem.id,
      score: state.score,
      passed: state.test_results.filter((r) => r.verdict === 'accepted').length,
      total: state.test_results.length,
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <WhiteboardExam
      problem={stableProblem}
      onExamComplete={handleExamComplete}
    />
  );
}
