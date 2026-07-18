'use client';

import React, { useState, useCallback, useId } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

const MIN_CHARS = 50;

interface FeynmanInputProps {
  /** The Feynman prompt shown above the textarea */
  prompt: string;
  /** Called when the user submits a valid explanation (≥ MIN_CHARS) */
  onComplete: () => void;
}

/**
 * FeynmanInput
 * ------------
 * Presents a Feynman-technique prompt and enforces a minimum explanation
 * length before the "Next" action becomes available.
 *
 * Rules:
 *  - User must type ≥ 50 characters before the "Next Chunk" button enables.
 *  - Character counter shows live progress; turns green when threshold met.
 *  - Textarea is uncontrolled in DOM terms but state is tracked via React.
 *  - No external state managers — self-contained.
 */
export default function FeynmanInput({
  prompt,
  onComplete,
}: FeynmanInputProps): React.ReactElement {
  const [value, setValue] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const textareaId = useId();

  const charCount = value.length;
  const isUnlocked = charCount >= MIN_CHARS;
  const remaining = Math.max(0, MIN_CHARS - charCount);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
    },
    []
  );

  const handleSubmit = useCallback(() => {
    if (!isUnlocked) return;
    setSubmitted(true);
    // Small delay so user sees success state before transitioning
    setTimeout(onComplete, 600);
  }, [isUnlocked, onComplete]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl+Enter / Cmd+Enter submits
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <section className="feynman-block flex flex-col gap-4">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border border-violet/50 bg-violet/10 flex items-center justify-center">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6 1.5C3.5 1.5 1.5 3.5 1.5 6s2 4.5 4.5 4.5 4.5-2 4.5-4.5S8.5 1.5 6 1.5zm0 7V6m0-2.5v.5"
              stroke="var(--color-violet)"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <div>
          <p className="text-xs font-mono text-violet/70 uppercase tracking-widest mb-1">
            Feynman Technique
          </p>
          <div className="text-sm text-ink leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex]}
              components={{ p: 'span' }}
            >
              {prompt}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* ── Textarea ─────────────────────────────────────────────── */}
      <div className="relative">
        <label htmlFor={textareaId} className="sr-only">
          Your explanation
        </label>
        <textarea
          id={textareaId}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={submitted}
          rows={5}
          placeholder="Giải thích bằng ngôn ngữ của bạn — như thể đang dạy cho người mới..."
          className={[
            'w-full resize-none rounded-lg border bg-surface-2/70 px-4 py-3',
            'font-mono text-sm text-ink placeholder:text-ink-faint',
            'outline-none transition-all duration-200',
            'focus:ring-1',
            submitted
              ? 'border-success/50 ring-success/30 opacity-70'
              : isUnlocked
              ? 'border-violet/50 ring-violet/25 focus:ring-violet/40'
              : 'border-border-strong focus:border-violet/40 focus:ring-violet/20',
          ].join(' ')}
          aria-describedby={`${textareaId}-counter`}
        />

        {/* Char counter overlaid at bottom-right of textarea */}
        <div
          id={`${textareaId}-counter`}
          className="absolute bottom-3 right-3 pointer-events-none"
          aria-live="polite"
          aria-atomic="true"
        >
          {submitted ? (
            <span className="text-xs font-mono text-success">✓ saved</span>
          ) : isUnlocked ? (
            <span className="text-xs font-mono text-success">
              {charCount} ✓
            </span>
          ) : (
            <span className="text-xs font-mono text-ink-faint">
              {remaining} more
            </span>
          )}
        </div>
      </div>

      {/* ── Progress strip ───────────────────────────────────────── */}
      <div
        className="h-0.5 w-full bg-border rounded-full overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${Math.min(100, (charCount / MIN_CHARS) * 100)}%`,
            background: isUnlocked
              ? 'linear-gradient(to right, var(--color-violet), var(--color-success))'
              : 'color-mix(in srgb, var(--color-violet) 50%, transparent)',
          }}
        />
      </div>

      {/* ── Submit button ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-faint">
          {isUnlocked
            ? 'Ctrl+Enter để tiếp tục'
            : `Cần thêm ${remaining} ký tự`}
        </p>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isUnlocked || submitted}
          className={[
            'relative inline-flex items-center gap-2 px-5 py-2 rounded-lg',
            'text-sm font-semibold tracking-wide transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'focus-visible:ring-offset-bg',
            submitted
              ? 'bg-success/20 text-success border border-success/30 cursor-default'
              : isUnlocked
              ? [
                  'bg-violet hover:bg-violet/90 text-bg border border-violet',
                  'shadow-lg shadow-violet/20 hover:shadow-violet/30',
                  'focus-visible:ring-violet cursor-pointer',
                  'active:scale-95',
                ].join(' ')
              : 'bg-surface-2 text-ink-faint border border-border cursor-not-allowed',
          ].join(' ')}
          aria-disabled={!isUnlocked || submitted}
        >
          {submitted ? (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2.5 7l3 3 6-6" stroke="var(--color-success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Saved
            </>
          ) : (
            <>
              Next Chunk
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </>
          )}
        </button>
      </div>
    </section>
  );
}
