'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

import type { Chunk } from '../types/curriculum';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import { ProgressBar } from './ui/ProgressBar';

interface ChunkViewerProps {
  /** Chunk ĐÃ được chuẩn hóa qua normalizeChunk() — không truyền dữ liệu thô */
  chunk: Chunk;
  total: number;
  index: number;
}

export default function ChunkViewer({
  chunk,
  total,
  index,
}: ChunkViewerProps): React.ReactElement {
  return (
    <article className="chunk-viewer flex flex-col gap-6">
      {/* ── Header bar ─────────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-4">
        <span className="chunk-id-badge font-mono text-xs tracking-widest px-3 py-1 rounded-sm border border-success/40 text-success bg-success/5">
          {chunk.id}
        </span>

        {/* Progress */}
        <div className="flex items-center gap-3 flex-1 max-w-xs ml-auto">
          <ProgressBar
            value={((index + 1) / total) * 100}
            tone="success"
            label="Tiến độ chunk"
            className="flex-1"
          />
          <span className="font-mono text-xs text-ink-faint tabular-nums whitespace-nowrap">
            {index + 1} / {total}
          </span>
        </div>
      </header>

      {/* ── Concept title ───────────────────────────────────────── */}
      <h2 className="text-2xl font-bold leading-tight text-ink tracking-tight">
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeKatex]}
          components={{ p: 'span' }}
        >
          {chunk.concept}
        </ReactMarkdown>
      </h2>

      {/* ── Theory Content ─────────────────────────────────────────── */}
      <section className="prose-content text-ink-dim leading-relaxed text-sm space-y-3">
        {chunk.theoryFormat === 'markdown' ? (
          <div className="markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex]}
            >
              {chunk.theory}
            </ReactMarkdown>
          </div>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(chunk.theory) }} />
        )}
      </section>

      {/* ── Active recall / Feynman Prompt ─────────────── */}
      {chunk.active_recall_q && (
        <aside className="recall-aside mt-2 rounded-lg border border-warning/25 bg-warning/5 px-5 py-4">
          <p className="text-xs font-mono text-warning/70 uppercase tracking-widest mb-1">
            Feynman / Active Recall
          </p>
          <div className="text-sm text-warning/80 leading-relaxed font-semibold">
            <ReactMarkdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex]}
              components={{ p: 'span' }}
            >
              {chunk.active_recall_q}
            </ReactMarkdown>
          </div>
        </aside>
      )}
    </article>
  );
}
