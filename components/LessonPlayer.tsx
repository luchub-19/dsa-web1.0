'use client';

import React, { useState, useCallback, useReducer } from 'react';
import ChunkViewer from './ChunkViewer';
import FeynmanInput from './FeynmanInput';
import ActiveRecallBlock from './ActiveRecallBlock';
import type { Chunk, LessonPhase } from '../types/curriculum';

// ─── State machine ─────────────────────────────────────────────────────────────

interface LessonState {
  chunkIndex: number;
  phase: LessonPhase;
  completedChunks: Set<number>;
}

type LessonAction =
  | { type: 'ADVANCE_PHASE' }
  | { type: 'NEXT_CHUNK' };

function getInitialPhase(chunk: Chunk): LessonPhase {
  return 'theory';
}

/**
 * Determines the next phase for a given chunk.
 * Flow per chunk: theory → (active-recall if code) → (feynman if prompt) → done
 */
function nextPhase(chunk: Chunk, current: LessonPhase): LessonPhase | 'done' {
  if (current === 'theory') {
    if (chunk.code_snippet) return 'active-recall';
    if (chunk.feynman_prompt) return 'feynman';
    return 'done';
  }
  if (current === 'active-recall') {
    if (chunk.feynman_prompt) return 'feynman';
    return 'done';
  }
  return 'done';
}

function lessonReducer(
  state: LessonState,
  action: LessonAction,
  chunks: Chunk[]
): LessonState {
  const currentChunk = chunks[state.chunkIndex];

  switch (action.type) {
    case 'ADVANCE_PHASE': {
      const next = nextPhase(currentChunk, state.phase);
      if (next === 'done') {
        // Mark chunk complete, move to next
        const newCompleted = new Set(state.completedChunks).add(state.chunkIndex);
        const nextIndex = state.chunkIndex + 1;
        if (nextIndex >= chunks.length) {
          return { ...state, completedChunks: newCompleted };
        }
        return {
          chunkIndex: nextIndex,
          phase: getInitialPhase(chunks[nextIndex]),
          completedChunks: newCompleted,
        };
      }
      return { ...state, phase: next };
    }

    case 'NEXT_CHUNK': {
      const nextIndex = state.chunkIndex + 1;
      if (nextIndex >= chunks.length) return state;
      return {
        chunkIndex: nextIndex,
        phase: 'theory',
        completedChunks: state.completedChunks,
      };
    }

    default:
      return state;
  }
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface LessonPlayerProps {
  chunks: Chunk[];
}

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * LessonPlayer
 * ------------
 * Orchestrates the full lesson flow:
 *   ChunkViewer → ActiveRecallBlock? → FeynmanInput? → next chunk
 *
 * Uses a pure reducer (no external state) to manage phase transitions.
 * Each component calls `onComplete` to signal readiness to advance.
 */
export default function LessonPlayer({
  chunks,
}: LessonPlayerProps): React.ReactElement {
  const [state, rawDispatch] = useReducer(
    (s: LessonState, a: LessonAction) => lessonReducer(s, a, chunks),
    {
      chunkIndex: 0,
      phase: 'theory',
      completedChunks: new Set<number>(),
    } satisfies LessonState
  );

  const dispatch = rawDispatch;

  const advancePhase = useCallback(() => {
    dispatch({ type: 'ADVANCE_PHASE' });
  }, [dispatch]);

  const isFinished =
    state.chunkIndex >= chunks.length ||
    (state.completedChunks.has(state.chunkIndex) &&
      state.chunkIndex === chunks.length - 1);

  if (isFinished) {
    return <FinishedScreen total={chunks.length} />;
  }

  const chunk = chunks[state.chunkIndex];

  return (
    <div className="lesson-player min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* ── Ambient background ──────────────────────────────────── */}
      <div
        className="pointer-events-none fixed inset-0 opacity-30"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(16,185,129,0.15) 0%, transparent 60%), ' +
            'radial-gradient(ellipse 60% 40% at 80% 100%, rgba(99,102,241,0.10) 0%, transparent 60%)',
        }}
      />

      {/* ── Main layout ─────────────────────────────────────────── */}
      <main className="relative z-10 max-w-2xl mx-auto px-5 pt-10 pb-24">
        {/* Page heading */}
        <div className="mb-8 flex items-baseline gap-3">
          <h1 className="font-mono text-xs tracking-[0.3em] text-emerald-500/60 uppercase">
            DSA / Linked Lists
          </h1>
        </div>

        {/* Animated card */}
        <div
          key={`${chunk.id}-${state.phase}`}
          className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-7 shadow-2xl shadow-black/40 space-y-8"
          style={{ animation: 'fadeSlideIn 0.3s ease-out both' }}
        >
          {/* Always show theory at top */}
          <ChunkViewer chunk={chunk} total={chunks.length} index={state.chunkIndex} />

          {/* Phase-specific component */}
          {state.phase === 'theory' && (
            <ContinueButton onClick={advancePhase} label="I understand — Continue" />
          )}

          {state.phase === 'active-recall' && chunk.code_snippet && (
            <>
              <Divider label="Code Challenge" />
              <ActiveRecallBlock
                codeSnippet={chunk.code_snippet}
                onComplete={advancePhase}
              />
            </>
          )}

          {state.phase === 'feynman' && chunk.feynman_prompt && (
            <>
              <Divider label="Feynman Check" />
              <FeynmanInput
                prompt={chunk.feynman_prompt}
                onComplete={advancePhase}
              />
            </>
          )}
        </div>

        {/* Skip (dev helper — remove in production) */}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => dispatch({ type: 'NEXT_CHUNK' })}
            className="text-xs font-mono text-slate-700 hover:text-slate-500 transition-colors"
          >
            skip chunk →
          </button>
        </div>
      </main>

      {/* Keyframe injection */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25%      { transform: translateX(-3px); }
          75%      { transform: translateX(3px); }
        }
        .animate-shake { animation: shake 0.25s ease-in-out; }

        /* Prose styles for theory HTML */
        .theory-body p  { margin-bottom: 0.6rem; }
        .theory-body ul { list-style: disc; padding-left: 1.25rem; margin-bottom: 0.6rem; }
        .theory-body ol { list-style: decimal; padding-left: 1.25rem; margin-bottom: 0.6rem; }
        .theory-body li { margin-bottom: 0.3rem; }
        .theory-body code {
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 0.82em;
          background: rgba(99,102,241,0.12);
          color: #a5b4fc;
          padding: 0.1em 0.35em;
          border-radius: 3px;
        }
        .theory-body strong { color: #e2e8f0; font-weight: 600; }
        .theory-body em    { color: #94a3b8; font-style: italic; }
        .theory-body table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.82rem;
          margin-bottom: 0.75rem;
        }
        .theory-body th {
          text-align: left;
          font-weight: 600;
          color: #94a3b8;
          border-bottom: 1px solid rgba(148,163,184,0.15);
          padding: 0.4rem 0.6rem;
        }
        .theory-body td {
          color: #cbd5e1;
          border-bottom: 1px solid rgba(148,163,184,0.08);
          padding: 0.4rem 0.6rem;
        }
        .theory-body td code { font-size: 0.78em; }
      `}</style>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function Divider({ label }: { label: string }): React.ReactElement {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <div className="flex-1 h-px bg-slate-800" />
      <span className="text-xs font-mono text-slate-600 uppercase tracking-widest">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-800" />
    </div>
  );
}

function ContinueButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}): React.ReactElement {
  return (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={onClick}
        className={[
          'px-5 py-2.5 rounded-lg text-sm font-semibold tracking-wide',
          'bg-slate-800 hover:bg-slate-700 text-slate-200',
          'border border-slate-700 hover:border-slate-500',
          'transition-all duration-150 active:scale-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500',
        ].join(' ')}
      >
        {label} →
      </button>
    </div>
  );
}

function FinishedScreen({ total }: { total: number }): React.ReactElement {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-5">
      <div className="text-center space-y-4">
        <div className="text-5xl" aria-hidden="true">🏆</div>
        <h2 className="text-2xl font-bold text-slate-100">Lesson Complete</h2>
        <p className="text-slate-400 text-sm font-mono">
          {total} chunks mastered — Linked Lists section done.
        </p>
      </div>
    </div>
  );
}
