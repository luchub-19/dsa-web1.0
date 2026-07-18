import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AccountBar from "../components/AccountBar";
import Providers from "./providers";

// Inter: long-form reading voice — theory content, prompts, body copy.
// Confirmed "vietnamese" subset (already relied on by the original app).
const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

// JetBrains Mono: the "OS" / system voice — labels, numbers, chunk ids,
// buttons, the wordmark. Also confirmed "vietnamese" subset, so accented
// short labels (e.g. "Đã học", "Chương") render in-face instead of
// silently falling back to a system mono for the diacritics.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StudyOS — Hệ thống Ôn tập DSA",
  description: "Nền tảng học Cấu trúc dữ liệu và Giải thuật cá nhân, dùng SuperMemo-2.",
};

// FIX: `themeColor` từng nằm trong `metadata` (xem build warning: "Unsupported
// metadata themeColor is configured in metadata export"). Next.js 16 tách
// riêng thành `viewport` export — để trong `metadata` khiến thẻ
// <meta name="theme-color"> không được render đúng.
export const viewport: Viewport = {
  themeColor: "#09090c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased bg-bg text-ink font-sans">
        <Providers>
          <AccountBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
