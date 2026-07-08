import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AccountBar from "../components/AccountBar";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dsa-web-beta.vercel.app";

// FIX: trước đây metadata chỉ có title/description trơn — chia sẻ link lên
// Messenger/Zalo/Facebook không hiện ảnh, không hiện mô tả đẹp, trông như
// spam link. Giờ khai báo đủ openGraph/twitter; ảnh OG được sinh tự động
// bởi app/opengraph-image.tsx (quy ước Next.js, không cần upload ảnh tay).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "StudyOS — Nền tảng học Cấu trúc Dữ liệu & Giải thuật",
    template: "%s · StudyOS",
  },
  description:
    "Học DSA với Spaced Repetition (SM-2), Feynman Technique và Active Recall — nhớ lâu hơn, không chỉ đọc rồi quên.",
  keywords: ["DSA", "cấu trúc dữ liệu", "giải thuật", "spaced repetition", "SM-2", "Feynman Technique", "học lập trình"],
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "StudyOS",
    title: "StudyOS — Nền tảng học Cấu trúc Dữ liệu & Giải thuật",
    description:
      "Học DSA với Spaced Repetition (SM-2), Feynman Technique và Active Recall — nhớ lâu hơn, không chỉ đọc rồi quên.",
  },
  twitter: {
    card: "summary_large_image",
    title: "StudyOS — Nền tảng học Cấu trúc Dữ liệu & Giải thuật",
    description: "Học DSA với Spaced Repetition, Feynman Technique và Active Recall.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-black text-white`}>
        <AccountBar />
        {children}
      </body>
    </html>
  );
}