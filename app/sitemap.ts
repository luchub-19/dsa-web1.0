import type { MetadataRoute } from 'next';
import { dsaCurriculum } from '../data/curriculum';

/**
 * sitemap.ts
 * ──────────
 * Quy ước Next.js App Router, tự động serve tại /sitemap.xml. Liệt kê
 * trang chủ + toàn bộ chương học (nội dung công khai, đáng để công cụ tìm
 * kiếm index) — không liệt kê /review, /settings, /exam (cá nhân hóa theo
 * người dùng, index không có ý nghĩa).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dsa-web-beta.vercel.app';

  const chapterEntries: MetadataRoute.Sitemap = dsaCurriculum.map((chapter) => ({
    url: `${base}/learn/${chapter.slug}`,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    ...chapterEntries,
  ];
}
