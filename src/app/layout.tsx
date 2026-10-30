import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Patchi",
  description: "GitHub 레포의 보안 취약점을 찾고, 검증하고, 고쳐서 PR 까지",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // 브라우저 확장이 <html> 에 속성을 끼워 넣어 생기는 하이드레이션 경고만 무시한다
    <html lang="ko" className={`${inter.variable} ${jetbrains.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
