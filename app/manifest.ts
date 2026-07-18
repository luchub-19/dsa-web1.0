import type { MetadataRoute } from 'next';

/**
 * manifest.ts
 * ───────────
 * FIX: trước đây không có PWA manifest — trên điện thoại, "Thêm vào màn
 * hình chính" sẽ không có tên/icon/màu theme đúng. Quy ước Next.js App
 * Router, tự động serve tại /manifest.webmanifest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'StudyOS — Nền tảng học DSA',
    short_name: 'StudyOS',
    description: 'Học Cấu trúc Dữ liệu & Giải thuật với Spaced Repetition, Feynman Technique và Active Recall.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090c',
    theme_color: '#09090c',
    lang: 'vi',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
