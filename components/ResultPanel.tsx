'use client';

import React, { useState } from 'react';
import type { SubmissionState, TestCaseResult } from '../../types/exam';

// ─── VerdictBadge (nội bộ — chỉ ResultPanel/TestCaseRow cần) ──────────────────

function VerdictBadge({ verdict }: { verdict: TestCaseResult['verdict'] }): React.ReactElement {
  const map: Record<TestCaseResult['verdict'], { label: string; cls: string; icon: string }> = {
    pending:             { label: 'Pending',    cls: 'text-slate-500 border-slate-700',          icon: '○' },
    running:             { label: 'Running…',   cls: 'text-amber-400 border-amber-700',           icon: '◌' },
    accepted:            { label: 'Accepted',   cls: 'text-emerald-400 border-emerald-700/60',    icon: '✓' },
    wrong_answer:        { label: 'Wrong',      cls: 'text-red-400 border-red-700/60',            icon: '✗' },
    time_limit_exceeded: { label: 'TLE',        cls: 'text-orange-400 border-orange-700/60',      icon: '⏱' },
    runtime_error:       { label: 'RTE',        cls: 'text-rose-400 border-rose-700/60',          icon: '⚡' },
    compilation_error:   { label: 'CE',         cls: 'text-yellow-400 border-yellow-700/60',      icon: '⚙' },
  };
  const { label, cls, icon } = map[verdict] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded border ${cls}`}>
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}

// ─── ScoreRing (nội bộ) ─────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }): React.ReactElement {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const filled = circ * (score / 100);
  const color = score === 100 ? '#34d399' : score >= 60 ? '#fbbf24' : '#f87171';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" viewBox="0 0 72 72" aria-label={`Score: ${score}%`}>
        <circle cx="36" cy="36" r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
        />
        <text x="36" y="40" textAnchor="middle" fontSize="14" fontWeight="700"
          fontFamily="monospace" fill={color}
        >
          {score}%
        </text>
      </svg>
      <p className="text-xs font-mono text-slate-500">Score</p>
    </div>
  );
}

// ─── TestCaseRow (nội bộ) ────────────────────────────────────────────────────────

function TestCaseRow({ result, index }: { result: TestCaseResult; index: number }): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const showDiff = !result.hidden &&
    result.verdict === 'wrong_answer' &&
    result.actual_output !== null;

  const isTerminal = result.verdict !== 'pending' && result.verdict !== 'running';

  return (
    <div className={[
      'rounded border transition-colors duration-300',
      result.verdict === 'accepted'
        ? 'border-emerald-900/50 bg-emerald-950/20'
        : result.verdict === 'pending' || result.verdict === 'running'
        ? 'border-white/[0.05] bg-white/[0.01]'
        : 'border-red-900/40 bg-red-950/10',
    ].join(' ')}>
      <button
        type="button"
        onClick={() => isTerminal && setExpanded((x) => !x)}
        disabled={!isTerminal}
        className="w-full flex items-center justify-between px-3 py-2
          text-left focus-visible:outline-none focus-visible:ring-1
          focus-visible:ring-cyan-800 rounded"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-600 tabular-nums w-5">
            {index + 1}.
          </span>
          <span className="text-xs font-mono text-slate-400">
            {result.hidden ? `Hidden test ${index + 1}` : result.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {result.time_ms !== null && (
            <span className="text-[10px] font-mono text-slate-600 tabular-nums">
              {result.time_ms}ms
            </span>
          )}
          <VerdictBadge verdict={result.verdict} />
          {isTerminal && showDiff && (
            <span className="text-[10px] text-slate-700" aria-hidden="true">
              {expanded ? '▲' : '▼'}
            </span>
          )}
        </div>
      </button>

      {expanded && showDiff && (
        <div className="px-3 pb-3 grid grid-cols-2 gap-2">
          <div>
            <p className="text-[9px] font-mono text-slate-700 uppercase mb-1">Got</p>
            <pre className="text-[11px] font-mono text-red-300/80
              whitespace-pre-wrap break-all bg-red-950/20 rounded p-2
              border border-red-900/30">
              {result.actual_output ?? '(empty)'}
            </pre>
          </div>
          <div>
            <p className="text-[9px] font-mono text-slate-700 uppercase mb-1">Expected</p>
            <pre className="text-[11px] font-mono text-emerald-300/80
              whitespace-pre-wrap break-all bg-emerald-950/20 rounded p-2
              border border-emerald-900/30">
              {result.expected_output}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface ResultPanelProps {
  submission: SubmissionState;
  passedCount: number;
  totalCount: number;
  rubric?: string[];
  onReset: () => void;
}

/**
 * ResultPanel
 * ───────────
 * Hiển thị kết quả chấm bài theo `submission.phase`: idle / error /
 * compile_error / done (score ring + danh sách test case + rubric). Không
 * gọi Judge0, không giữ submission state — chỉ nhận qua props từ
 * useJudgeSubmission (ở component cha).
 */
export default function ResultPanel({
  submission,
  passedCount,
  totalCount,
  rubric,
  onReset,
}: ResultPanelProps): React.ReactElement {
  return (
    <div className="p-5 space-y-5">
      {/* Idle state */}
      {submission.phase === 'idle' && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="text-3xl opacity-20" aria-hidden="true">◎</span>
          <p className="text-xs font-mono text-slate-700">No submission yet</p>
        </div>
      )}

      {/* Error state */}
      {submission.phase === 'error' && (
        <div className="rounded-lg border border-red-800/60 bg-red-950/30 p-4">
          <p className="text-xs font-mono text-red-400 mb-2 font-bold">Submission error</p>
          <p className="text-xs text-red-300/70 font-mono whitespace-pre-wrap">
            {submission.error_message}
          </p>
          <button
            type="button"
            onClick={onReset}
            className="mt-3 text-xs font-mono text-slate-500 hover:text-slate-300
              underline underline-offset-2 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Compile error */}
      {submission.compile_error && (
        <div className="rounded-lg border border-yellow-800/50 bg-yellow-950/30 p-4">
          <p className="text-[10px] font-mono text-yellow-500 uppercase
            tracking-widest mb-2">
            Compilation Error
          </p>
          <pre className="text-xs text-yellow-200/70 whitespace-pre-wrap
            overflow-x-auto max-h-40 font-mono leading-relaxed">
            {submission.compile_error}
          </pre>
        </div>
      )}

      {/* Score ring (only when done) */}
      {submission.phase === 'done' && submission.score !== null && (
        <div className="flex items-center justify-between
          rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <ScoreRing score={submission.score} />
          <div className="text-right space-y-1">
            <p className="text-xs font-mono text-slate-500">
              {passedCount} / {totalCount} tests
            </p>
            {submission.total_time_ms && (
              <p className="text-xs font-mono text-slate-600">
                Wall: {(submission.total_time_ms / 1000).toFixed(1)}s
              </p>
            )}
            <button
              type="button"
              onClick={onReset}
              className="text-[10px] font-mono text-slate-700
                hover:text-slate-400 underline underline-offset-2"
            >
              Re-submit
            </button>
          </div>
        </div>
      )}

      {/* Test case list */}
      {submission.test_results.length > 0 && (
        <section className="space-y-2">
          <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            Test Cases
          </p>
          {submission.test_results.map((result, i) => (
            <TestCaseRow key={i} result={result} index={i} />
          ))}
        </section>
      )}

      {/* Rubric (visible after submission) */}
      {submission.phase === 'done' && rubric && (
        <section className="rounded-lg border border-white/[0.05]
          bg-white/[0.02] p-4 space-y-2">
          <p className="text-[10px] font-mono text-slate-600
            uppercase tracking-widest mb-2">
            Rubric
          </p>
          <ul className="space-y-1">
            {rubric.map((item, i) => (
              <li key={i} className="text-xs text-slate-400 font-mono
                flex items-start gap-2">
                <span className="text-slate-700 flex-shrink-0">·</span>
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
