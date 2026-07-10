'use strict';

import type { Chapter } from '../data/curriculum';
import type { SM2CardRecord } from '../types/spacedRepetition';

// ─── Mastery levels ───────────────────────────────────────────────────────────
//
// "Completed" (đã học) = chunk có total_reviews > 0, giữ đúng định nghĩa đang
// dùng ở app/page.tsx (AnimatedCount "Đã học"). Ngoài ra phân loại thêm mức độ
// "mastery" dựa trên ease_factor + repetition_count để phân biệt "học rồi
// nhưng còn yếu" và "đã nắm chắc" — hai chunk cùng total_reviews=1 có thể
// khác nhau rất nhiều về độ vững nếu grade lần đầu là 1 vs 5.

export type MasteryLevel = 'new' | 'learning' | 'mastered';

/**
 * Phân loại 1 card theo mức độ thành thạo:
 *  - 'new'      : chưa từng review (total_reviews === 0)
 *  - 'mastered' : đã qua ít nhất 2 lần lặp thành công liên tiếp (repetition_count >= 2)
 *                 VÀ ease_factor >= mặc định (2.5) — tức nhớ tốt, không bị hạ EF.
 *  - 'learning' : mọi trường hợp còn lại đã review nhưng chưa đạt ngưỡng trên.
 */
export function getMasteryLevel(card: SM2CardRecord | undefined): MasteryLevel {
  if (!card || card.total_reviews === 0) return 'new';
  if (card.repetition_count >= 2 && card.ease_factor >= 2.5) return 'mastered';
  return 'learning';
}

// ─── Per-chapter progress ─────────────────────────────────────────────────────

export interface ChapterProgress {
  slug: string;
  total: number;
  completed: number;
  mastered: number;
  percent: number; // 0-100, làm tròn — % completed (đã review >= 1 lần)
}

/**
 * Tính progress cho 1 chương dựa trên map allCards (từ useSpacedRepetition).
 * Chunk id trong chapter.data khớp trực tiếp với key trong allCards (chunk_id).
 */
export function computeChapterProgress(
  chapter: Chapter,
  allCards: Record<string, SM2CardRecord>
): ChapterProgress {
  const total = chapter.data.length;
  let completed = 0;
  let mastered = 0;

  for (const raw of chapter.data) {
    const card = allCards[raw.id];
    const level = getMasteryLevel(card);
    if (level !== 'new') completed++;
    if (level === 'mastered') mastered++;
  }

  return {
    slug: chapter.slug,
    total,
    completed,
    mastered,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

// ─── Overall (toàn curriculum) progress ───────────────────────────────────────

export interface OverallProgress {
  totalChunks: number;
  completedChunks: number;
  masteredChunks: number;
  percent: number;
  chaptersCompleted: number; // số chương đã hoàn thành 100%
  chaptersTotal: number;
}

export function computeOverallProgress(
  chapters: Chapter[],
  allCards: Record<string, SM2CardRecord>
): OverallProgress {
  let totalChunks = 0;
  let completedChunks = 0;
  let masteredChunks = 0;
  let chaptersCompleted = 0;

  for (const chapter of chapters) {
    const p = computeChapterProgress(chapter, allCards);
    totalChunks += p.total;
    completedChunks += p.completed;
    masteredChunks += p.mastered;
    if (p.total > 0 && p.completed === p.total) chaptersCompleted++;
  }

  return {
    totalChunks,
    completedChunks,
    masteredChunks,
    percent: totalChunks === 0 ? 0 : Math.round((completedChunks / totalChunks) * 100),
    chaptersCompleted,
    chaptersTotal: chapters.length,
  };
}
