'use strict';

import type { CodeSegment, BlankSegment } from '../types/curriculum';

/**
 * FIX / MỞ RỘNG (xem thảo luận trước khi viết nội dung 14 chương còn lại):
 *
 * TRƯỚC: chỉ nhận diện được 6 từ khóa cố định (this->, ->, nullptr, NULL,
 * new, delete, while) — thiết kế riêng cho code thao tác con trỏ/Linked List.
 * Với code Sắp xếp, Đệ quy, Cây, Hash Table... không có từ khóa nào trong
 * danh sách này xuất hiện tự nhiên → không thể tạo bài tập Active Recall có
 * ý nghĩa cho 14/15 chương còn lại.
 *
 * SAU: hỗ trợ thêm cú pháp blank TƯỜNG MINH ngay trong chuỗi code_snippet:
 *   {{đáp_án}}
 * Ví dụ: "int mid = (lo + hi) {{/}} 2;" → tạo 1 ô trống, đáp án đúng là "/".
 *
 * Ưu tiên: nếu code_snippet có ít nhất 1 "{{...}}", dùng cú pháp tường minh
 * (tác giả nội dung tự quyết định blank ở đâu — linh hoạt cho MỌI chủ đề).
 * Nếu KHÔNG có "{{...}}" nào, tự động dùng lại cơ chế từ khóa cũ (giữ
 * nguyên tương thích ngược với linkedlists.json — không cần sửa lại
 * code_snippet đã viết trước đó).
 */

const BLANK_TARGETS: readonly string[] = [
  'this->',
  '->',
  'nullptr',
  'NULL',
  'new',
  'delete',
  'while',
];

const MAX_BLANKS = 6;

const EXPLICIT_BLANK_PATTERN = /\{\{([^}]+)\}\}/g;

function buildKeywordPattern(): RegExp {
  const parts = BLANK_TARGETS.map((kw) => {
    const escaped = kw.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    return /^[a-zA-Z_]+$/.test(kw) ? `\\b${escaped}\\b` : escaped;
  });
  return new RegExp(`(${parts.join('|')})`, 'g');
}

const KEYWORD_PATTERN = buildKeywordPattern();

function parseWithPattern(code: string, pattern: RegExp, extractValue: (match: RegExpExecArray) => string): CodeSegment[] {
  const segments: CodeSegment[] = [];
  let lastIndex = 0;
  let blankCount = 0;
  let idCounter = 0;

  pattern.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(code)) !== null) {
    const matchStart = match.index;
    const fullMatch = match[0];
    const value = extractValue(match);

    if (matchStart > lastIndex) {
      segments.push({ type: 'text', value: code.slice(lastIndex, matchStart), id: idCounter++ });
    }

    if (blankCount < MAX_BLANKS) {
      segments.push({ type: 'blank', value, id: idCounter++ });
      blankCount++;
    } else {
      segments.push({ type: 'text', value: fullMatch, id: idCounter++ });
    }

    lastIndex = matchStart + fullMatch.length;
  }

  if (lastIndex < code.length) {
    segments.push({ type: 'text', value: code.slice(lastIndex), id: idCounter++ });
  }

  return segments;
}

/**
 * Parses `code` into text/blank segments.
 * Ưu tiên cú pháp {{...}} tường minh; nếu không có, dùng từ khóa cố định.
 */
export function parseCodeWithBlanks(code: string): CodeSegment[] {
  const hasExplicitBlanks = /\{\{[^}]+\}\}/.test(code);

  if (hasExplicitBlanks) {
    return parseWithPattern(code, EXPLICIT_BLANK_PATTERN, (m) => m[1]);
  }
  return parseWithPattern(code, KEYWORD_PATTERN, (m) => m[0]);
}

export function getBlanks(segments: CodeSegment[]): BlankSegment[] {
  return segments.filter((s): s is BlankSegment => s.type === 'blank');
}

export type { BlankSegment } from '../types/curriculum';
