'use client';

import { useState } from 'react';
import Editor from './Editor';
import ProblemPanel from './ProblemPanel';
import ResultPanel from './ResultPanel';
import LiveTimer from './LiveTimer';
import { useJudgeSubmission } from '../hooks/useJudgeSubmission';
import type { ExamProblem, SubmissionState } from '../types/exam';

interface WhiteboardExamProps {
  problem: ExamProblem;
  onExamComplete?: (state: SubmissionState, code: string) => void;
}

/**
 * WhiteboardExam
 * ──────────────
 * Orchestrator mỏng — chỉ lo layout (top bar 2 cột: editor trái, panel tab
 * phải) và điều phối giữa các phần đã tách:
 *   - Editor: khung code whiteboard (chặn paste, gutter số dòng)
 *   - ProblemPanel: đề bài + sample test case (thuần hiển thị)
 *   - ResultPanel: kết quả chấm (score ring, danh sách test case, rubric)
 *   - LiveTimer: đồng hồ đếm lúc đang chấm
 *   - useJudgeSubmission: toàn bộ state machine chấm bài (reducer,
 *     AbortController, gọi Judge0)
 *
 * FIX (đợt nâng cấp giao diện): bản trước đó của file này (viết lại từ đầu vì
 * không biết phần tách module đã có sẵn — xem ghi chú trong lib/theme/grades.ts
 * về việc 2 đợt việc song song) đã tự chứa lại toàn bộ logic + UI trong 1 file
 * 837 dòng — đúng vấn đề mà việc tách module này định giải quyết. Giờ dùng
 * lại đúng 5 file đã tách, chỉ tô theo design token mới.
 */
export default function WhiteboardExam({
  problem,
  onExamComplete,
}: WhiteboardExamProps) {
  const [code, setCode] = useState<string>(problem.starter_code ?? '');
  const [activePanel, setActivePanel] = useState<'problem' | 'results'>('problem');

  const {
    submission,
    submitStartedAt,
    isRunning,
    passedCount,
    totalCount,
    submit,
    reset,
  } = useJudgeSubmission(problem, onExamComplete);

  // Chuyển tab ngay trong handler click (không phải trong useEffect theo dõi
  // submission.phase) — codebase này tránh set-state-trong-effect có chủ đích
  // (xem hooks/useSpacedRepetition.ts, app/review/page.tsx).
  const handleSubmit = () => {
    if (isRunning || !code.trim()) return;
    setActivePanel('results');
    void submit(code);
  };

  const handleReset = () => {
    reset();
    setActivePanel('problem');
  };

  return (
    <div className="whiteboard-exam-root flex flex-col h-screen bg-bg text-ink font-mono overflow-hidden">

      {/* ══ Top bar ══════════════════════════════════════════════ */}
      <header className="flex-none flex items-center justify-between px-5 py-2.5
        border-b border-white/5 bg-bg/90 backdrop-blur-sm z-20">

        <div className="flex items-center gap-3">
          <span className="text-[10px] tracking-[0.25em] text-ink-faint uppercase">
            Exam
          </span>
          <span className="text-white/20 select-none">|</span>
          <h1 className="text-sm font-semibold text-ink truncate max-w-xs">
            {problem.title}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px]
            font-mono text-ink-faint border border-border px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-signal/60" aria-hidden="true" />
            {problem.language}
          </span>

          {isRunning && <LiveTimer startedAt={submitStartedAt} />}

          {submission.phase === 'done' && submission.score !== null && (
            <span className={`text-xs font-mono tabular-nums ${
              submission.score === 100 ? 'text-success' :
              submission.score >= 60  ? 'text-warning'   : 'text-danger'
            }`}>
              {passedCount}/{totalCount} passed
            </span>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isRunning || !code.trim()}
            className={[
              'px-4 py-1.5 rounded text-xs font-bold tracking-wider uppercase',
              'border transition-all duration-150 focus-visible:outline-none',
              'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
              isRunning
                ? 'border-warning/50 text-warning bg-warning/10 cursor-wait animate-pulse'
                : !code.trim()
                ? 'border-border text-ink-faint cursor-not-allowed bg-transparent'
                : [
                    'border-success/60 text-success bg-success/10',
                    'hover:bg-success/15 hover:border-success/80',
                    'active:scale-95 focus-visible:ring-success',
                  ].join(' '),
            ].join(' ')}
            aria-busy={isRunning}
          >
            {isRunning ? 'Judging…' : 'Submit'}
          </button>
        </div>
      </header>

      {/* ══ Body: editor + side panel ════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">
        <Editor value={code} onChange={setCode} disabled={isRunning} />

        <aside
          className="flex-none w-80 xl:w-96 flex flex-col border-l border-white/[0.06]
            bg-[#0a0a0a] overflow-hidden"
        >
          {/* Panel tabs */}
          <div className="flex-none flex border-b border-white/[0.05]">
            {(['problem', 'results'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActivePanel(tab)}
                className={[
                  'flex-1 py-2.5 text-[10px] font-mono tracking-widest uppercase',
                  'transition-colors duration-150 focus-visible:outline-none',
                  activePanel === tab
                    ? 'text-ink border-b border-signal'
                    : 'text-ink-faint hover:text-ink-dim',
                ].join(' ')}
              >
                {tab}
                {tab === 'results' && totalCount > 0 && (
                  <span className="ml-1.5 text-ink-faint">
                    ({passedCount}/{totalCount})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto">
            {activePanel === 'problem' && <ProblemPanel problem={problem} />}
            {activePanel === 'results' && (
              <ResultPanel
                submission={submission}
                passedCount={passedCount}
                totalCount={totalCount}
                rubric={problem.rubric}
                onReset={handleReset}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
