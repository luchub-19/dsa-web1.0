'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// PHÁT HIỆN QUAN TRỌNG (đọc trước khi sửa gì khác):
//
// Rà toàn bộ 15 file JSON trong data/ cho thấy 14/15 chương dùng schema
// "V2" (title/content/recallPrompt/blanks), CHỈ RIÊNG linkedlists.json dùng
// schema "legacy" (concept/theory_html/code_snippet/active_recall_q/
// feynman_prompt). Và quan trọng hơn: code_snippet + feynman_prompt — tức
// TOÀN BỘ phần "Active Recall" (điền code) và "Feynman Technique" (giải
// thích lại bằng lời) — CHỈ tồn tại trong linkedlists.json. 14 chương còn
// lại có code_snippet=0 và feynman_prompt=0 trên mọi chunk.
//
// Hệ quả: với 14/15 chương, learn/[slug]/page.tsx sẽ tự động bỏ qua bước 2
// (Feynman) và bước 3 (Active Recall), nhảy thẳng từ "đọc lý thuyết" sang
// "tự chấm điểm SM-2". Toàn bộ cơ chế học chủ động (được quảng bá là tính
// năng chính của app) hiện chỉ hoạt động cho ĐÚNG 1 CHƯƠNG.
//
// Đây KHÔNG phải lỗi code — code xử lý đúng theo dữ liệu nó nhận được. Đây
// là khoảng trống NỘI DUNG cần đội ngũ biên soạn bài học lấp đầy (viết thêm
// code_snippet + feynman_prompt cho 14 file JSON còn lại), không phải việc
// lập trình có thể tự làm thay.
// ─────────────────────────────────────────────────────────────────────────────

export interface RawChunkLegacy {
  id: string;
  concept: string;
  theory_html: string;
  code_snippet: string | null;
  active_recall_q: string;
  feynman_prompt: string | null;
}

export interface RawChunkV2 {
  id: string;
  title: string;
  /** Markdown, không phải HTML */
  content: string;
  recallPrompt: string;
  /** Hiện KHÔNG được UI nào tiêu thụ — xem cảnh báo cuối file */
  blanks?: string[];
  code_snippet?: string | null;
  feynman_prompt?: string | null;
}

export type RawChunk = RawChunkLegacy | RawChunkV2;

function isV2(chunk: RawChunk): chunk is RawChunkV2 {
  return typeof (chunk as RawChunkV2).content === 'string';
}

/**
 * Hình dạng DUY NHẤT mà mọi component nên dùng. Import `Chunk` từ đây,
 * KHÔNG import RawChunkLegacy/RawChunkV2 trực tiếp ở component.
 */
export interface Chunk {
  id: string;
  concept: string;
  theory: string;
  theoryFormat: 'html' | 'markdown';
  code_snippet: string | null;
  active_recall_q: string;
  feynman_prompt: string | null;
}

/** Điểm DUY NHẤT trong app biết về sự tồn tại của 2 schema cũ. */
export function normalizeChunk(raw: RawChunk): Chunk {
  if (isV2(raw)) {
    return {
      id: raw.id,
      concept: raw.title,
      theory: raw.content,
      theoryFormat: 'markdown',
      code_snippet: raw.code_snippet ?? null,
      active_recall_q: raw.recallPrompt,
      feynman_prompt: raw.feynman_prompt ?? null,
    };
  }
  return {
    id: raw.id,
    concept: raw.concept,
    theory: raw.theory_html,
    theoryFormat: 'html',
    code_snippet: raw.code_snippet,
    active_recall_q: raw.active_recall_q,
    feynman_prompt: raw.feynman_prompt,
  };
}

export function normalizeChunks(raws: RawChunk[]): Chunk[] {
  return raws.map(normalizeChunk);
}

export type LessonPhase = 'theory' | 'active-recall' | 'feynman';

export interface BlankSegment {
  type: 'blank';
  value: string;   // correct answer
  id: number;
}

export interface TextSegment {
  type: 'text';
  value: string;
  id: number;
}

export type CodeSegment = TextSegment | BlankSegment;

export interface BlankState {
  [blankId: number]: {
    userValue: string;
    status: 'idle' | 'correct' | 'wrong';
  };
}
