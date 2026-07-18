'use client';

import React from 'react';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import type { ExamProblem } from '../types/exam';

export interface ProblemPanelProps {
  problem: ExamProblem;
}

/**
 * ProblemPanel
 * ────────────
 * Thuần hiển thị — không giữ state, không biết gì về Judge0/submission.
 * Đề bài, ràng buộc, và các sample test case (test ẩn chỉ đếm số lượng).
 *
 * FIX: import gốc là '../../lib/sanitizeHtml' và '../../types/exam' — sai 1
 * cấp thư mục vì file này nằm trực tiếp trong components/ (cùng cấp với
 * ChunkViewer.tsx, Editor.tsx), không phải components/<subfolder>/. Đây là
 * lỗi khiến Vercel build fail ("Cannot find module").
 */
export default function ProblemPanel({ problem }: ProblemPanelProps): React.ReactElement {
  const visibleCases = problem.test_cases.filter((tc) => !tc.hidden).slice(0, 3);
  const hiddenCount = problem.test_cases.filter((tc) => tc.hidden).length;

  return (
    <div className="p-5 space-y-5">
      {/* Description */}
      <section>
        <p className="text-[10px] font-mono text-ink-faint uppercase tracking-widest mb-3">
          Problem
        </p>
        <div
          className="prose-content text-sm text-ink-dim leading-relaxed space-y-2"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(problem.description_html) }}
        />
      </section>

      {/* Constraints */}
      <section>
        <p className="text-[10px] font-mono text-ink-faint uppercase tracking-widest mb-2">
          Constraints
        </p>
        <ul className="space-y-1 text-xs font-mono text-ink-faint">
          <li>⏱ Time limit: {problem.time_limit_seconds}s</li>
          <li>💾 Memory: {problem.memory_limit_mb} MB</li>
          <li>🔤 Language: {problem.language}</li>
        </ul>
      </section>

      {/* Visible test cases */}
      <section>
        <p className="text-[10px] font-mono text-ink-faint uppercase tracking-widest mb-2">
          Sample Cases
        </p>
        {visibleCases.map((tc, i) => (
          <div key={i} className="mb-3 rounded border border-white/[0.06] overflow-hidden">
            <div className="px-3 py-1.5 bg-white/[0.02] text-[10px] font-mono
              text-ink-faint border-b border-white/[0.04]">
              {tc.label}
            </div>
            <div className="grid grid-cols-2 divide-x divide-white/[0.04]">
              <div className="px-3 py-2">
                <p className="text-[9px] font-mono text-ink-faint/70 mb-1 uppercase">Input</p>
                <pre className="text-xs text-ink-dim whitespace-pre-wrap break-all">
                  {tc.input || '(empty)'}
                </pre>
              </div>
              <div className="px-3 py-2">
                <p className="text-[9px] font-mono text-ink-faint/70 mb-1 uppercase">Expected</p>
                <pre className="text-xs text-success/80 whitespace-pre-wrap break-all">
                  {tc.expected_output}
                </pre>
              </div>
            </div>
          </div>
        ))}
        {hiddenCount > 0 && (
          <p className="text-[10px] font-mono text-ink-faint/70 italic">
            + {hiddenCount} hidden test{hiddenCount > 1 ? 's' : ''}
          </p>
        )}
      </section>
    </div>
  );
}
