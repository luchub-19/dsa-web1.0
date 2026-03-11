'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // NẾU THIẾU DÒNG NÀY, TOÁN SẼ BỊ VỠ NÁT

import type { Chunk } from '../types/curriculum';

interface ChunkViewerProps {
  chunk: any;
  total: number;
  index: number;
}

export default function ChunkViewer({
  chunk,
  total,
  index,
}: ChunkViewerProps): React.ReactElement {
  const progressPercent = Math.round(((index + 1) / total) * 100);

  return (
    <article className="chunk-viewer flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <span className="chunk-id-badge font-mono text-xs tracking-widest px-3 py-1 rounded-sm border border-emerald-500/40 text-emerald-400 bg-emerald-500/5">
          {chunk.id}
        </span>
        <div className="flex items-center gap-3 flex-1 max-w-xs ml-auto">
          <div
            className="flex-1 h-0.5 bg-slate-800 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={index + 1}
            aria-valuemin={1}
            aria-valuemax={total}
          >
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
            {index + 1} / {total}
          </span>
        </div>
      </header>

      <h2 className="text-2xl font-bold leading-tight text-slate-100 tracking-tight">
        {chunk.title || chunk.concept}
      </h2>

      <section className="theory-body prose-custom text-slate-300 leading-relaxed text-sm space-y-3 whitespace-pre-wrap">
        {chunk.content ? (
          <div className="markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {chunk.content}
            </ReactMarkdown>
          </div>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: chunk.theory_html }} />
        )}
      </section>

      <aside className="recall-aside mt-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-5 py-4">
        <p className="text-xs font-mono text-amber-400/70 uppercase tracking-widest mb-1">
          Feynman / Active Recall
        </p>
        <p className="text-sm text-amber-100/80 leading-relaxed font-semibold">
          {chunk.recallPrompt || chunk.active_recall_q}
        </p>
      </aside>
    </article>
  );
}