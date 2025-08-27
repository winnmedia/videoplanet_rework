import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";


import { StoreProvider } from "@shared/ui";

import { ConditionalHeader } from "./components/ConditionalHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VLANET 영상 협업툴의 신세계, 비디오플래닛",
  description: "VLANET - 영상 제작 및 협업을 위한 프로페셔널 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Header items 설정
  const leftItems = [
    {
      type: 'img' as const,
      src: '/logo.svg',
      className: 'logo',
    },
  ];

  const rightItems = [
    {
      type: 'string' as const,
      text: 'U',
      className: 'nick',
    },
    {
      type: 'string' as const,
      text: 'user@example.com',
      className: 'mail',
    },
  ];

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <StoreProvider>
          <div className="min-h-screen flex flex-col">
            <ConditionalHeader leftItems={leftItems} rightItems={rightItems} />
            <main className="flex-1">
              {children}
            </main>
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
