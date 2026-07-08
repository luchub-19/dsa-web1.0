import type { MetadataRoute } from 'next';

/**
 * robots.ts
 * ─────────
 * Quy ước Next.js App Router, tự động serve tại /robots.txt.
 * Chặn crawl các route API và trang cài đặt cá nhân (không có nội dung
 * công khai đáng để index).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/settings', '/review'],
    },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dsa-web-beta.vercel.app'}/sitemap.xml`,
  };
}
