import { ImageResponse } from 'next/og';

/**
 * opengraph-image.tsx
 * ────────────────────
 * FIX: trước đây chia sẻ link app lên Messenger/Zalo/Facebook không hiện
 * ảnh/mô tả gì (không có Open Graph image) — trông như spam link. File này
 * theo đúng quy ước Next.js App Router, tự động sinh ảnh OG lúc build,
 * không cần thiết kế file ảnh tay hay upload lên đâu cả.
 */

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#09090c',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 25% 25%, rgba(52,224,196,0.22) 0%, transparent 45%), radial-gradient(circle at 75% 75%, rgba(164,140,255,0.18) 0%, transparent 45%)',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: '#131318',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
            }}
          >
            🧠
          </div>
          <div style={{ fontSize: 64, fontWeight: 900, color: '#eceef2', display: 'flex' }}>
            Study<span style={{ color: '#34e0c4' }}>OS</span>
          </div>
        </div>
        <div style={{ fontSize: 28, color: '#9898a5', display: 'flex' }}>
          Nền tảng học Cấu trúc Dữ liệu &amp; Giải thuật
        </div>
        <div style={{ fontSize: 20, color: '#56565f', marginTop: 16, display: 'flex', gap: 24 }}>
          <span>Spaced Repetition</span>
          <span>·</span>
          <span>Feynman Technique</span>
          <span>·</span>
          <span>Active Recall</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
