import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AccountBar from "../components/AccountBar";
import Providers from "./providers";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hệ thống Ôn tập DSA",
  description: "Nền tảng học Cấu trúc dữ liệu và Giải thuật",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-black text-white`}>
        <Providers>
          <AccountBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}