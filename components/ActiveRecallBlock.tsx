'use client';

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import { parseCodeWithBlanks, getBlanks } from '../lib/parseCodeBlanks';
import type { CodeSegment, BlankSegment, BlankState } from '../types/curriculum';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveRecallBlockProps {
  /** Raw C++ code string from chunk.code_snippet */
  codeSnippet: string;
  /** Called once every blank is filled correctly */
  onComplete: () => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface BlankInputProps {
  segment: BlankSegment;
  state: BlankState[number];
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (id: number, value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, id: number) => void;
  showAnswers: boolean;
}

/**
 * A single fill-in-the-blank input rendered inline inside a <pre> block.
 * Width is sized to match the expected answer length.
 */
function BlankInput({
  segment,
  state,
  inputRef,
  onChange,
  onKeyDown,
  showAnswers,
}: BlankInputProps): React.ReactElement {
  const charWidth = Math.max(segment.value.length, 3);

  const statusClass =
    state.status === 'correct'
      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
      : state.status === 'wrong'
      ? 'border-red-500/70 bg-red-500/10 text-red-300 animate-shake'
      : 'border-cyan-500/50 bg-cyan-500/5 text-cyan-200 focus:border-cyan-400 focus:bg-cyan-500/10';

  return (
    <span className="inline-flex items-center relative" aria-label={`Blank ${segment.id + 1}`}>
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        value={showAnswers && state.status !== 'correct' ? segment.value : state.userValue}
        readOnly={state.status === 'correct' || showAnswers}
        onChange={(e) => onChange(segment.id, e.target.value)}
        onKeyDown={(e) => onKeyDown(e, segment.id)}
        aria-label={`Fill in blank: expected ${segment.value.length} characters`}
        className={[
          'inline-block font-mono text-sm rounded border px-1 py-0',
          'outline-none transition-all duration-150',
          'leading-none align-baseline',
          statusClass,
          state.status === 'correct' ? 'cursor-default' : 'cursor-text',
        ].join(' ')}
        style={{
          width: `${charWidth + 1.5}ch`,
          // Prevent line-height from breaking the pre block flow
          height: '1.4em',
          verticalAlign: 'baseline',
        }}
      />
      {/* Correct tick */}
      {state.status === 'correct' && (
        <span
          className="absolute -top-2 -right-1 text-emerald-400 text-xs leading-none pointer-events-none select-none"
          aria-hidden="true"
        >
          ✓
        </span>
      )}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * ActiveRecallBlock
 * -----------------
 * Parses `codeSnippet`, replaces occurrences of target keywords (new, ->,
 * nullptr, NULL, delete, while) with interactive input fields.
 *
 * Behaviour:
 *  - User types into each blank; validation fires on Enter or Tab.
 *  - Correct answers lock the field (green); wrong blinks red.
 *  - "Check All" button batch-validates remaining blanks.
 *  - "Show Answers" reveals answers after 3 wrong attempts on the same blank.
 *  - `onComplete` fires only once every blank reaches 'correct'.
 */
export default function ActiveRecallBlock({
  codeSnippet,
  onComplete,
}: ActiveRecallBlockProps): React.ReactElement {
  // ── Parse once ────────────────────────────────────────────────
  const segments = useMemo<CodeSegment[]>(
    () => parseCodeWithBlanks(codeSnippet),
    [codeSnippet]
  );

  const blanks = useMemo<BlankSegment[]>(() => getBlanks(segments), [segments]);

  // ── State ─────────────────────────────────────────────────────
  const initialBlankState = useMemo<BlankState>(() => {
    const s: BlankState = {};
    blanks.forEach((b) => {
      s[b.id] = { userValue: '', status: 'idle' };
    });
    return s;
  }, [blanks]);

  const [blankState, setBlankState] = useState<BlankState>(initialBlankState);
  const [wrongCounts, setWrongCounts] = useState<Record<number, number>>({});
  const [showAnswers, setShowAnswers] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);

  // Refs for focus management
  const inputRefs = useRef<Map<number, React.RefObject<HTMLInputElement | null>>>(new Map());
  blanks.forEach((b) => {
    if (!inputRefs.current.has(b.id)) {
      inputRefs.current.set(b.id, React.createRef<HTMLInputElement>());
    }
  });

  const getRef = (id: number) =>
    inputRefs.current.get(id) ?? React.createRef<HTMLInputElement>();

  // Focus first blank on mount
  useEffect(() => {
    if (blanks.length > 0) {
      const firstRef = inputRefs.current.get(blanks[0].id);
      firstRef?.current?.focus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Validation helpers ────────────────────────────────────────
  const validateBlank = useCallback(
    (id: number, value: string) => {
      const blank = blanks.find((b) => b.id === id);
      if (!blank) return;

      const correct = value.trim() === blank.value;

      setBlankState((prev) => ({
        ...prev,
        [id]: { userValue: value, status: correct ? 'correct' : 'wrong' },
      }));

      if (!correct) {
        setWrongCounts((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
        // Reset wrong → idle after 800 ms so animation can replay
        setTimeout(() => {
          setBlankState((prev) => ({
            ...prev,
            [id]: { ...prev[id], status: 'idle' },
          }));
        }, 800);
      } else {
        // Focus next unfilled blank
        const idx = blanks.findIndex((b) => b.id === id);
        for (let i = idx + 1; i < blanks.length; i++) {
          const nextBlank = blanks[i];
          if (blankState[nextBlank.id]?.status !== 'correct') {
            inputRefs.current.get(nextBlank.id)?.current?.focus();
            break;
          }
        }
      }
    },
    [blanks, blankState]
  );

  // ── Check completion after each state update ──────────────────
  useEffect(() => {
    if (completed) return;
    if (blanks.length === 0) return;
    const allCorrect = blanks.every((b) => blankState[b.id]?.status === 'correct');
    if (allCorrect) {
      setCompleted(true);
      setTimeout(onComplete, 800);
    }
  }, [blankState, blanks, completed, onComplete]);

  // ── Event handlers ────────────────────────────────────────────
  const handleChange = useCallback((id: number, value: string) => {
    setBlankState((prev) => ({
      ...prev,
      [id]: { ...prev[id], userValue: value, status: 'idle' },
    }));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, id: number) => {
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        validateBlank(id, blankState[id]?.userValue ?? '');
      }
    },
    [validateBlank, blankState]
  );

  const handleCheckAll = useCallback(() => {
    blanks.forEach((b) => {
      if (blankState[b.id]?.status !== 'correct') {
        validateBlank(b.id, blankState[b.id]?.userValue ?? '');
      }
    });
  }, [blanks, blankState, validateBlank]);

  // Show answers only if any blank has ≥ 3 wrong attempts
  const canReveal = Object.values(wrongCounts).some((c) => c >= 3);

  // ── Stats ─────────────────────────────────────────────────────
  const correctCount = blanks.filter(
    (b) => blankState[b.id]?.status === 'correct'
  ).length;

  // ── Render ────────────────────────────────────────────────────
  if (blanks.length === 0) {
    // No blankable keywords found — show code read-only and auto-complete
    return (
      <section className="active-recall-block">
        <p className="text-xs font-mono text-slate-500 mb-2">
          No blanks in this snippet — read carefully.
        </p>
        <pre className="code-pre rounded-lg bg-slate-900 border border-slate-700/60 p-4 overflow-x-auto">
          <code className="text-sm text-slate-300 font-mono">{codeSnippet}</code>
        </pre>
      </section>
    );
  }

  return (
    <section className="active-recall-block flex flex-col gap-4" aria-label="Fill in the blanks">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-cyan-400/70 uppercase tracking-widest mb-0.5">
            Active Recall — Code
          </p>
          <p className="text-xs text-slate-500">
            Fill each blank and press <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono text-xs">Enter</kbd> or <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono text-xs">Tab</kbd> to check.
          </p>
        </div>

        {/* Progress pills */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {blanks.map((b) => (
            <span
              key={b.id}
              className={[
                'w-2 h-2 rounded-full transition-colors duration-300',
                blankState[b.id]?.status === 'correct'
                  ? 'bg-emerald-400'
                  : 'bg-slate-700',
              ].join(' ')}
              aria-hidden="true"
            />
          ))}
          <span className="ml-1 font-mono text-xs text-slate-500 tabular-nums">
            {correctCount}/{blanks.length}
          </span>
        </div>
      </div>

      {/* ── Code block with inline inputs ─────────────────────── */}
      <div
        className={[
          'rounded-lg border overflow-x-auto transition-colors duration-500',
          completed
            ? 'border-emerald-500/40 bg-emerald-950/30'
            : 'border-slate-700/60 bg-slate-900/80',
        ].join(' ')}
      >
        {/* Fake title bar */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-700/60">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
          <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
          <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
          <span className="ml-2 font-mono text-xs text-slate-600">snippet.cpp</span>
          {completed && (
            <span className="ml-auto text-xs font-mono text-emerald-400">
              ✓ All correct
            </span>
          )}
        </div>

        <pre className="p-4 text-sm font-mono leading-relaxed whitespace-pre overflow-x-auto">
          {segments.map((seg) => {
            if (seg.type === 'text') {
              return (
                <span key={seg.id} className="text-slate-300">
                  {seg.value}
                </span>
              );
            }
            // Blank segment
            return (
              <BlankInput
                key={seg.id}
                segment={seg}
                state={blankState[seg.id] ?? { userValue: '', status: 'idle' }}
                inputRef={getRef(seg.id)}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                showAnswers={showAnswers}
              />
            );
          })}
        </pre>
      </div>

      {/* ── Action bar ─────────────────────────────────────────── */}
      {!completed && (
        <div className="flex items-center justify-between gap-3">
          {canReveal && !showAnswers ? (
            <button
              type="button"
              onClick={() => setShowAnswers(true)}
              className="text-xs font-mono text-slate-500 hover:text-amber-400 transition-colors underline underline-offset-2"
            >
              Show answers
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={handleCheckAll}
            className={[
              'px-4 py-2 rounded-lg text-sm font-semibold',
              'bg-cyan-600/80 hover:bg-cyan-500/90 text-white',
              'border border-cyan-500/50 shadow-lg shadow-cyan-900/30',
              'transition-all duration-150 active:scale-95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500',
            ].join(' ')}
          >
            Check All
          </button>
        </div>
      )}

      {/* ── Completion banner ──────────────────────────────────── */}
      {completed && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg border border-emerald-500/30 bg-emerald-500/8"
          role="status"
          aria-live="polite"
        >
          <span className="text-2xl" aria-hidden="true">🎯</span>
          <div>
            <p className="text-sm font-semibold text-emerald-300">
              All blanks correct!
            </p>
            <p className="text-xs text-emerald-500/70">Moving to next section…</p>
          </div>
        </div>
      )}
    </section>
  );
}
