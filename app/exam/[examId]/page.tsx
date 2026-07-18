'use client';

import { use, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import WhiteboardExam from '../../../components/WhiteboardExam';
import type { ExamProblem, SubmissionState } from '../../../types/exam';

// ─── Static exam registries ───────────────────────────────────────────────────

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

// ─── Problem picker (chỉ hiện khi bộ đề có > 1 bài) ────────────────────────────

function ProblemPicker({
  examId,
  problems,
  onSelect,
}: {
  examId: string;
  problems: ExamProblem[];
  onSelect: (index: number) => void;
}) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-4">
        <p className="text-[10px] font-mono text-ink-faint uppercase tracking-widest text-center">
          Bộ đề: {examId} · {problems.length} bài
        </p>
        <div className="space-y-2">
          {problems.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(i)}
              className="w-full text-left px-5 py-4 rounded-lg border border-border
                bg-surface hover:bg-surface-hover hover:border-border-strong
                transition-colors duration-150 focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-signal"
            >
              <p className="text-sm font-semibold text-ink">{p.title}</p>
              <p className="text-xs font-mono text-ink-faint mt-1">
                {p.test_cases.length} test cases · {p.language}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page (Client Component) ──────────────────────────────────────────────────

/**
 * ExamPage
 * ────────
 * FIX: bản gốc luôn lấy `problems?.[0]` — với bộ đề 'pointers' có 2 bài
 * (insertTail, reverseList), bài thứ 2 KHÔNG BAO GIỜ tới được người dùng dù
 * đã tồn tại sẵn trong exam_pointers.json. Giờ:
 *   - Nếu URL có `?problem=<id-hoặc-index>` → dùng đúng bài đó.
 *   - Nếu bộ đề chỉ có 1 bài → giữ hành vi cũ (vào thẳng, không cần chọn).
 *   - Nếu bộ đề có > 1 bài và chưa chọn → hiện màn hình chọn bài trước.
 */
export default function ExamPage({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { examId } = use(params);

  const problems = EXAM_REGISTRY[examId] ?? null;

  const requestedProblem = searchParams.get('problem');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(() => {
    if (!problems) return null;
    if (!requestedProblem) return problems.length === 1 ? 0 : null;
    const byId = problems.findIndex((p) => p.id === requestedProblem);
    if (byId >= 0) return byId;
    const byIndex = Number(requestedProblem);
    return Number.isInteger(byIndex) && problems[byIndex] ? byIndex : null;
  });

  const problem = selectedIndex !== null ? (problems?.[selectedIndex] ?? null) : null;
  const stableProblem = useMemo(() => problem, [problem]);

  // ── Unknown examId ────────────────────────────────────────────────────────
  if (!problems) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-4xl" aria-hidden="true">🔍</p>
          <h1 className="text-xl font-bold text-ink font-mono">
            Exam not found
          </h1>
          <p className="text-sm text-ink-faint font-mono">
            <code className="text-ink-dim">examId: {examId}</code> không tồn tại
            trong registry.
          </p>
          <button
            type="button"
            onClick={() => router.push('/learn/pointers')}
            className="mt-4 px-5 py-2 rounded-lg border border-border-strong
              bg-surface hover:bg-surface-hover text-ink text-sm font-semibold
              transition-colors duration-150"
          >
            ← Quay lại bài học
          </button>
        </div>
      </div>
    );
  }

  // ── Nhiều bài, chưa chọn ────────────────────────────────────────────────────
  if (!stableProblem) {
    return (
      <ProblemPicker
        examId={examId}
        problems={problems}
        onSelect={setSelectedIndex}
      />
    );
  }

  // ── Submission callback ───────────────────────────────────────────────────
  // (dùng problemId đã "chốt" thay vì stableProblem.id để TS narrow đúng —
  // closure không tự suy luận lại narrowing của biến ngoài sau early-return)

  const problemId = stableProblem.id;

  function handleExamComplete(state: SubmissionState) {
    // In production: POST to /api/exam/submit with userId + examId + state
    console.info('[ExamPage] Submission complete', {
      examId,
      problemId,
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
