'use client';

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useReducer,
  useId,
} from 'react';
import { gradeSubmission } from '../lib/judge0';
import type {
  ExamProblem,
  SubmissionState,
  TestCaseResult,
  SubmissionPhase,
} from '../types/exam';

// ─── Submission reducer ────────────────────────────────────────────────────────

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

// ─── Props ─────────────────────────────────────────────────────────────────────

interface WhiteboardExamProps {
  problem: ExamProblem;
  /** Called when exam is submitted and graded (regardless of score) */
  onExamComplete?: (state: SubmissionState) => void;
}

// ─── Paste-blocked textarea hook ──────────────────────────────────────────────

/**
 * Returns ref + handler to attach to a <textarea> that silently
 * blocks all paste events and shows a brief UI notification.
 */
function usePasteBlock(): {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  pasteBlocked: boolean;
} {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [pasteBlocked, setPasteBlocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const handler = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setPasteBlocked(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setPasteBlocked(false), 2_000);
    };

    el.addEventListener('paste', handler);
    return () => {
      el.removeEventListener('paste', handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { textareaRef, pasteBlocked };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

interface VerdictBadgeProps {
  verdict: TestCaseResult['verdict'];
}
function VerdictBadge({ verdict }: VerdictBadgeProps): React.ReactElement {
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

interface TimerProps { startedAt: number | null }
function LiveTimer({ startedAt }: TimerProps): React.ReactElement {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 100);
    return () => clearInterval(id);
  }, [startedAt]);
  const secs = (elapsed / 1000).toFixed(1);
  return (
    <span className="font-mono text-xs text-slate-500 tabular-nums">
      {startedAt ? `${secs}s` : '—'}
    </span>
  );
}

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

// ─── Main component ────────────────────────────────────────────────────────────

/**
 * WhiteboardExam
 * ──────────────
 * A no-frills whiteboard-style code editor for exams.
 *
 * Design choices:
 *  – No syntax highlighting (mirrors a real whiteboard / paper exam)
 *  – Paste is blocked at the DOM event level; any paste attempt shows
 *    a brief "No paste" toast without disrupting the writing flow
 *  – Full Judge0 CE integration: parallel submission → live polling
 *    → per-test-case results streaming in as they finish
 *  – AbortController tied to component unmount so in-flight requests
 *    are cancelled cleanly
 */
export default function WhiteboardExam({
  problem,
  onExamComplete,
}: WhiteboardExamProps): React.ReactElement {
  // ── Editor state ───────────────────────────────────────────────
  const [code, setCode] = useState<string>(problem.starter_code ?? '');
  const [lineCount, setLineCount] = useState<number>(
    () => (problem.starter_code ?? '').split('\n').length
  );

  // ── Paste block ────────────────────────────────────────────────
  const { textareaRef, pasteBlocked } = usePasteBlock();

  // ── Submission state machine ───────────────────────────────────
  const [submission, dispatch] = useReducer(submissionReducer, initialSubmissionState);
  const abortRef = useRef<AbortController | null>(null);
  const submitStartRef = useRef<number | null>(null);

  // ── Panels ────────────────────────────────────────────────────
  const [activePanel, setActivePanel] = useState<'problem' | 'results'>('problem');

  // ── IDs for accessibility ──────────────────────────────────────
  const editorId = useId();

  // ── Cleanup on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  // ── Handlers ──────────────────────────────────────────────────

  const handleCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setCode(val);
      setLineCount(val.split('\n').length);
    },
    []
  );

  /** Insert a tab character instead of focusing the next element */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const next = code.substring(0, start) + '    ' + code.substring(end);
        setCode(next);
        setLineCount(next.split('\n').length);
        // Restore cursor after React re-render
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 4;
        });
      }
    },
    [code]
  );

  const handleSubmit = useCallback(async () => {
    if (submission.phase === 'submitting' || submission.phase === 'judging') return;
    if (!code.trim()) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    submitStartRef.current = Date.now();

    dispatch({ type: 'START_SUBMIT' });

    // Tiny delay so React flushes the UI before async work begins
    await new Promise((r) => setTimeout(r, 50));

    dispatch({ type: 'START_JUDGE', total: problem.test_cases.length });
    setActivePanel('results');

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
      onExamComplete?.(finalState);
    }
  }, [code, problem, submission.phase, onExamComplete]);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: 'RESET' });
    setActivePanel('problem');
  }, []);

  // ── Derived ────────────────────────────────────────────────────
  const isRunning =
    submission.phase === 'submitting' || submission.phase === 'judging';

  const passedCount = submission.test_results.filter(
    (r) => r.verdict === 'accepted'
  ).length;
  const totalCount = submission.test_results.length;

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="whiteboard-exam-root flex flex-col h-screen bg-[#0f0f0f] text-slate-200 overflow-hidden"
      style={{ fontFamily: "'IBM Plex Mono', 'JetBrains Mono', 'Fira Code', monospace" }}
    >

      {/* ══ Top bar ══════════════════════════════════════════════ */}
      <header className="flex-none flex items-center justify-between px-5 py-2.5
        border-b border-white/5 bg-[#0f0f0f]/90 backdrop-blur-sm z-20">

        {/* Left: problem title */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] tracking-[0.25em] text-slate-600 uppercase">
            Exam
          </span>
          <span className="text-white/20 select-none">|</span>
          <h1 className="text-sm font-semibold text-slate-200 truncate max-w-xs">
            {problem.title}
          </h1>
        </div>

        {/* Right: lang badge + timer + submit */}
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px]
            font-mono text-slate-500 border border-slate-800 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/60" aria-hidden="true" />
            {problem.language}
          </span>

          {isRunning && (
            <LiveTimer startedAt={submitStartRef.current} />
          )}

          {submission.phase === 'done' && submission.score !== null && (
            <span className={`text-xs font-mono tabular-nums ${
              submission.score === 100 ? 'text-emerald-400' :
              submission.score >= 60  ? 'text-amber-400'   : 'text-red-400'
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
              'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f0f]',
              isRunning
                ? 'border-amber-700/50 text-amber-600 bg-amber-950/40 cursor-wait animate-pulse'
                : !code.trim()
                ? 'border-slate-800 text-slate-700 cursor-not-allowed bg-transparent'
                : [
                    'border-emerald-700/60 text-emerald-300 bg-emerald-950/40',
                    'hover:bg-emerald-900/40 hover:border-emerald-600/80',
                    'active:scale-95 focus-visible:ring-emerald-500',
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

        {/* ── Left: whiteboard editor ─────────────────────────── */}
        <div className="flex flex-col flex-1 overflow-hidden relative">

          {/* Paste-blocked toast */}
          {pasteBlocked && (
            <div
              role="alert"
              aria-live="assertive"
              className="absolute top-3 left-1/2 -translate-x-1/2 z-50
                px-4 py-2 rounded-lg border border-red-700/60 bg-red-950/90
                text-xs font-mono text-red-300 shadow-xl
                pointer-events-none select-none"
              style={{ animation: 'fadeSlideDown 0.2s ease-out both' }}
            >
              ⛔ Paste disabled — whiteboard mode
            </div>
          )}

          {/* Editor header */}
          <div className="flex-none flex items-center justify-between
            px-4 py-1.5 bg-[#141414] border-b border-white/[0.04]">
            <span className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">
              solution.cpp
            </span>
            <span className="text-[10px] text-slate-700 font-mono tabular-nums">
              {lineCount} {lineCount === 1 ? 'line' : 'lines'}
              {' · '}
              {code.length} chars
            </span>
          </div>

          {/* Line numbers + textarea */}
          <div className="flex flex-1 overflow-hidden">

            {/* Gutter */}
            <div
              className="flex-none w-10 overflow-hidden bg-[#0d0d0d]
                border-r border-white/[0.04] select-none"
              aria-hidden="true"
            >
              <div
                className="pt-3 pb-3 text-right pr-2.5"
                style={{ lineHeight: '1.625rem' }}
              >
                {Array.from({ length: Math.max(lineCount, 1) }, (_, i) => (
                  <div
                    key={i}
                    className="text-[11px] font-mono text-slate-700"
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>

            {/* The actual whiteboard textarea */}
            <label htmlFor={editorId} className="sr-only">
              Write your C++ solution
            </label>
            <textarea
              id={editorId}
              ref={textareaRef}
              value={code}
              onChange={handleCodeChange}
              onKeyDown={handleKeyDown}
              disabled={isRunning}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              placeholder={"// Write your solution here\n// (paste is disabled)"}
              className={[
                'flex-1 resize-none bg-[#0f0f0f] text-slate-200',
                'font-mono text-sm leading-[1.625rem]',
                'px-4 pt-3 pb-3',
                'outline-none border-none',
                'placeholder:text-slate-800',
                'selection:bg-cyan-900/40',
                // Subtle scanline texture on the whiteboard
                'whiteboard-texture',
                isRunning ? 'opacity-60 cursor-wait' : 'cursor-text',
              ].join(' ')}
              style={{
                tabSize: 4,
                caretColor: '#67e8f9',
              }}
              aria-label="Code editor — paste disabled"
              aria-multiline="true"
            />
          </div>
        </div>

        {/* ── Right panel: problem / results ──────────────────── */}
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
                    ? 'text-slate-200 border-b border-cyan-500'
                    : 'text-slate-600 hover:text-slate-400',
                ].join(' ')}
              >
                {tab}
                {tab === 'results' && totalCount > 0 && (
                  <span className="ml-1.5 text-slate-600">
                    ({passedCount}/{totalCount})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Problem panel ────────────────────────────────── */}
            {activePanel === 'problem' && (
              <div className="p-5 space-y-5">
                {/* Description */}
                <section>
                  <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">
                    Problem
                  </p>
                  <div
                    className="problem-body text-sm text-slate-300 leading-relaxed space-y-2"
                    dangerouslySetInnerHTML={{ __html: problem.description_html }}
                  />
                </section>

                {/* Constraints */}
                <section>
                  <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">
                    Constraints
                  </p>
                  <ul className="space-y-1 text-xs font-mono text-slate-500">
                    <li>⏱ Time limit: {problem.time_limit_seconds}s</li>
                    <li>💾 Memory: {problem.memory_limit_mb} MB</li>
                    <li>🔤 Language: {problem.language}</li>
                  </ul>
                </section>

                {/* Visible test cases */}
                <section>
                  <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">
                    Sample Cases
                  </p>
                  {problem.test_cases
                    .filter((tc) => !tc.hidden)
                    .slice(0, 3)
                    .map((tc, i) => (
                      <div
                        key={i}
                        className="mb-3 rounded border border-white/[0.06] overflow-hidden"
                      >
                        <div className="px-3 py-1.5 bg-white/[0.02] text-[10px] font-mono
                          text-slate-600 border-b border-white/[0.04]">
                          {tc.label}
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-white/[0.04]">
                          <div className="px-3 py-2">
                            <p className="text-[9px] font-mono text-slate-700 mb-1 uppercase">
                              Input
                            </p>
                            <pre className="text-xs text-slate-400 whitespace-pre-wrap break-all">
                              {tc.input || '(empty)'}
                            </pre>
                          </div>
                          <div className="px-3 py-2">
                            <p className="text-[9px] font-mono text-slate-700 mb-1 uppercase">
                              Expected
                            </p>
                            <pre className="text-xs text-emerald-500/80 whitespace-pre-wrap break-all">
                              {tc.expected_output}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  {problem.test_cases.some((tc) => tc.hidden) && (
                    <p className="text-[10px] font-mono text-slate-700 italic">
                      + {problem.test_cases.filter((t) => t.hidden).length} hidden test{problem.test_cases.filter((t) => t.hidden).length > 1 ? 's' : ''}
                    </p>
                  )}
                </section>
              </div>
            )}

            {/* ── Results panel ─────────────────────────────────── */}
            {activePanel === 'results' && (
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
                    <p className="text-xs font-mono text-red-400 mb-2 font-bold">
                      Submission error
                    </p>
                    <p className="text-xs text-red-300/70 font-mono whitespace-pre-wrap">
                      {submission.error_message}
                    </p>
                    <button
                      type="button"
                      onClick={handleReset}
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
                        onClick={handleReset}
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
                    <p className="text-[10px] font-mono text-slate-600
                      uppercase tracking-widest">
                      Test Cases
                    </p>
                    {submission.test_results.map((result, i) => (
                      <TestCaseRow key={i} result={result} index={i} />
                    ))}
                  </section>
                )}

                {/* Rubric (visible after submission) */}
                {submission.phase === 'done' && problem.rubric && (
                  <section className="rounded-lg border border-white/[0.05]
                    bg-white/[0.02] p-4 space-y-2">
                    <p className="text-[10px] font-mono text-slate-600
                      uppercase tracking-widest mb-2">
                      Rubric
                    </p>
                    <ul className="space-y-1">
                      {problem.rubric.map((item, i) => (
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
            )}
          </div>
        </aside>
      </div>

      {/* ══ Styles injected once ════════════════════════════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,600;1,400&display=swap');

        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(6,182,212,0); }
          50%       { box-shadow: 0 0 12px 2px rgba(6,182,212,0.15); }
        }

        /* Subtle scanline/grain overlay to evoke whiteboard texture */
        .whiteboard-texture {
          background-image:
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent calc(1.625rem - 1px),
              rgba(255,255,255,0.012) calc(1.625rem - 1px),
              rgba(255,255,255,0.012) 1.625rem
            );
          background-attachment: local;
        }

        /* Problem body prose */
        .problem-body p  { margin-bottom: 0.5rem; }
        .problem-body ul { list-style: disc; padding-left: 1.1rem; margin-bottom: 0.5rem; }
        .problem-body ol { list-style: decimal; padding-left: 1.1rem; margin-bottom: 0.5rem; }
        .problem-body li { margin-bottom: 0.2rem; font-size: 0.82rem; }
        .problem-body code {
          font-size: 0.78em;
          background: rgba(99,102,241,0.12);
          color: #a5b4fc;
          padding: 0.1em 0.3em;
          border-radius: 3px;
        }
        .problem-body strong { color: #e2e8f0; }
      `}</style>
    </div>
  );
}

// ─── TestCaseRow ───────────────────────────────────────────────────────────────

interface TestCaseRowProps {
  result: TestCaseResult;
  index: number;
}

function TestCaseRow({ result, index }: TestCaseRowProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const showDiff = !result.hidden &&
    result.verdict === 'wrong_answer' &&
    result.actual_output !== null;

  const isTerminal =
    result.verdict !== 'pending' && result.verdict !== 'running';

  return (
    <div className={[
      'rounded border transition-colors duration-300',
      result.verdict === 'accepted'
        ? 'border-emerald-900/50 bg-emerald-950/20'
        : result.verdict === 'pending' || result.verdict === 'running'
        ? 'border-white/[0.05] bg-white/[0.01]'
        : 'border-red-900/40 bg-red-950/10',
    ].join(' ')}>

      {/* Row header */}
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

      {/* Expanded diff */}
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
            <p className="text-[9px] font-mono text-slate-700 uppercase mb-1">
              Expected
            </p>
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
