'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

// ─── Paste-blocked textarea hook (nội bộ — chỉ Editor cần) ────────────────────

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

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface EditorProps {
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
  filename?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────────

/**
 * Editor
 * ──────
 * Whiteboard-style code editor: không syntax highlighting, chặn paste (mô
 * phỏng thi viết tay/whiteboard thật), có gutter số dòng. Hoàn toàn tự chứa
 * — không biết gì về Judge0 hay submission state, chỉ nhận value/onChange
 * như 1 input có kiểm soát bình thường.
 *
 * FIX (đợt nâng cấp giao diện): recolor sang design token chung của app
 * (xem app/globals.css) thay vì slate/cyan mặc định. `.whiteboard-texture`
 * đặt trực tiếp ở đây (không phải globals.css) vì chỉ component này dùng.
 */
export default function Editor({
  value,
  onChange,
  disabled,
  filename = 'solution.cpp',
}: EditorProps): React.ReactElement {
  const { textareaRef, pasteBlocked } = usePasteBlock();
  const editorId = useId();
  const lineCount = value.split('\n').length;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  /** Insert a tab character instead of focusing the next element */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const next = value.substring(0, start) + '    ' + value.substring(end);
        onChange(next);
        // Restore cursor after React re-render
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 4;
        });
      }
    },
    [value, onChange]
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      {/* Paste-blocked toast */}
      {pasteBlocked && (
        <div
          role="alert"
          aria-live="assertive"
          className="absolute top-3 left-1/2 -translate-x-1/2 z-50
            px-4 py-2 rounded-lg border border-danger/60 bg-danger/15
            text-xs font-mono text-danger shadow-xl
            pointer-events-none select-none"
          style={{ animation: 'fadeSlideDown 0.2s ease-out both' }}
        >
          ⛔ Paste disabled — whiteboard mode
        </div>
      )}

      {/* Editor header */}
      <div className="flex-none flex items-center justify-between
        px-4 py-1.5 bg-[#141414] border-b border-white/[0.04]">
        <span className="text-[10px] text-ink-faint font-mono tracking-widest uppercase">
          {filename}
        </span>
        <span className="text-[10px] text-ink-faint/70 font-mono tabular-nums">
          {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          {' · '}
          {value.length} chars
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
          <div className="pt-3 pb-3 text-right pr-2.5" style={{ lineHeight: '1.625rem' }}>
            {Array.from({ length: Math.max(lineCount, 1) }, (_, i) => (
              <div key={i} className="text-[11px] font-mono text-ink-faint/70">
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
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          placeholder={"// Write your solution here\n// (paste is disabled)"}
          className={[
            'flex-1 resize-none bg-bg text-ink',
            'font-mono text-sm leading-[1.625rem]',
            'px-4 pt-3 pb-3',
            'outline-none border-none',
            'placeholder:text-ink-faint/60',
            'selection:bg-signal/25',
            'whiteboard-texture',
            disabled ? 'opacity-60 cursor-wait' : 'cursor-text',
          ].join(' ')}
          style={{ tabSize: 4, caretColor: 'var(--color-signal)' }}
          aria-label="Code editor — paste disabled"
          aria-multiline="true"
        />
      </div>

      <style>{`
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
      `}</style>
    </div>
  );
}
