'use strict';

/**
 * sanitizeHtml
 * ────────────
 * Bộ lọc HTML tối giản, KHÔNG phụ thuộc thư viện ngoài. Dùng cho mọi nơi có
 * dangerouslySetInnerHTML: ChunkViewer, ReadOnlyCard (review page),
 * WhiteboardExam (problem panel).
 *
 * Đây KHÔNG phải sanitizer hoàn chỉnh cấp production. Nội dung hiện tại do
 * chính nhóm viết tay trong file JSON (không phải input người dùng), rủi ro
 * XSS thực tế hiện tại thấp — nhưng nếu sau này cho phép người dùng (giảng
 * viên, học sinh) nhập HTML, BẮT BUỘC thay hàm này bằng thư viện chuyên
 * dụng như `isomorphic-dompurify` hoặc `sanitize-html`.
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'code', 'pre',
  'ul', 'ol', 'li', 'blockquote', 'span', 'div',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a',
]);

export function sanitizeHtml(html: string): string {
  if (!html) return '';

  let out = html.replace(
    /<(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\/\1>/gi,
    ''
  );
  out = out.replace(/<(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi, '');
  out = out.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  out = out.replace(
    /\s(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi,
    ''
  );
  out = out.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, tagName: string) => {
    return ALLOWED_TAGS.has(tagName.toLowerCase()) ? match : '';
  });

  return out;
}
