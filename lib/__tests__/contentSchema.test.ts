import { describe, it, expect } from 'vitest';
import { dsaCurriculum } from '../../data/curriculum';
import { normalizeChunks } from '../../types/curriculum';
import { parseCodeWithBlanks, getBlanks } from '../parseCodeBlanks';

// ─────────────────────────────────────────────────────────────────────────────
// Lưới an toàn cho việc 3 người viết song song, tự merge không qua review
// (xem lib/parseCodeBlanks.ts để hiểu đầy đủ 2 cơ chế đục lỗ bên dưới).
//
// KHÔNG assert "mọi chunk phải có feynman_prompt" — trong lúc 12/15 chương
// đang được viết dở, assertion đó sẽ đỏ trên MỌI PR (kể cả PR không liên
// quan) cho tới khi người cuối cùng xong. Thay vào đó, test dưới đây CHỈ
// assert tính ĐÚNG CẤU TRÚC của code_snippet đã tồn tại — bug loại này sai là
// sai ngay từ chunk đầu tiên viết, không phụ thuộc tiến độ tổng thể.
//
// Bug cụ thể được chặn: tác giả viết code_snippet cho 1 chunk KHÔNG thuộc chủ
// đề con trỏ (tức đa số 12 chương còn thiếu — Sắp xếp, DP, Cây, Hash Table,
// Priority Queue...) nhưng quên cú pháp {{đáp_án}} tường minh. Cơ chế đục lỗ
// theo từ khóa cũ (new/delete/nullptr/NULL/->/while) chỉ tự nhiên xuất hiện ở
// code thao tác con trỏ — với code không thuộc chủ đề đó, kết quả là 0 ô
// trống, bài tập render ra nhưng không có gì để điền. Không ai nhận ra cho
// tới khi bấm thử tay.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_BLANKS = 6; // phải khớp const cùng tên trong lib/parseCodeBlanks.ts

interface ChunkWithCode {
  chapterSlug: string;
  chunkId: string;
  codeSnippet: string;
}

const chunksWithCode: ChunkWithCode[] = dsaCurriculum.flatMap((chapter) =>
  normalizeChunks(chapter.data)
    .filter((chunk) => !!chunk.code_snippet)
    .map((chunk) => ({
      chapterSlug: chapter.slug,
      chunkId: chunk.id,
      codeSnippet: chunk.code_snippet as string,
    }))
);

describe('Cấu trúc code_snippet trên toàn bộ giáo trình', () => {
  it('mỗi chunk có code_snippet phải sinh ra 1-6 ô trống thật sự (không được 0)', () => {
    const broken = chunksWithCode.filter(({ codeSnippet }) => {
      const blanks = getBlanks(parseCodeWithBlanks(codeSnippet));
      return blanks.length === 0;
    });

    expect(
      broken.map((b) => `${b.chapterSlug} / chunk ${b.chunkId}`),
      'Các chunk sau có code_snippet nhưng KHÔNG sinh ra ô trống nào — thiếu ' +
        'cú pháp {{đáp_án}} và code cũng không khớp từ khóa auto-detect ' +
        '(new/delete/nullptr/NULL/->/while). Xem comment trong ' +
        'lib/parseCodeBlanks.ts.'
    ).toEqual([]);
  });

  it('không chunk nào dùng quá 6 dấu {{...}} tường minh (dư sẽ bị lặng lẽ bỏ qua)', () => {
    const overLimit = chunksWithCode.filter(({ codeSnippet }) => {
      const explicitMarkers = codeSnippet.match(/\{\{[^}]+\}\}/g) ?? [];
      return explicitMarkers.length > MAX_BLANKS;
    });

    expect(
      overLimit.map((b) => `${b.chapterSlug} / chunk ${b.chunkId}`),
      `Các chunk sau dùng nhiều hơn ${MAX_BLANKS} dấu {{...}} — parseCodeBlanks.ts ` +
        `chỉ nhận ${MAX_BLANKS} ô đầu tiên, các {{...}} dư sẽ hiện ra dưới dạng ` +
        'text thô thay vì ô điền, có thể không đúng ý tác giả.'
    ).toEqual([]);
  });

  it('[báo cáo tiến độ — không fail] tỉ lệ feynman_prompt / code_snippet theo từng chương', () => {
    const rows = dsaCurriculum.map((chapter) => {
      const chunks = normalizeChunks(chapter.data);
      const withFeynman = chunks.filter((c) => !!c.feynman_prompt).length;
      const withCode = chunks.filter((c) => !!c.code_snippet).length;
      return {
        chapter: chapter.slug,
        total: chunks.length,
        feynman_prompt: `${withFeynman}/${chunks.length}`,
        code_snippet: `${withCode}/${chunks.length}`,
      };
    });

    console.table(rows);
    expect(true).toBe(true); // chỉ để hiện báo cáo, không chặn CI theo tiến độ
  });
});