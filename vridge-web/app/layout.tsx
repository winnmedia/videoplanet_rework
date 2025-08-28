import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { StoreProvider } from "@shared/ui";
import { NavigationProvider } from "@/features/navigation";

import { ConditionalHeader } from "./components/ConditionalHeader";
import "./globals.css";

// FontAwesome 설정 import
import '@/lib/fontawesome';
import '@fortawesome/fontawesome-svg-core/styles.css';

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
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <StoreProvider>
          <NavigationProvider>
            <div className="min-h-screen flex flex-col">
              <ConditionalHeader leftItems={leftItems} rightItems={rightItems} />
              <main className="flex-1">
                {children}
              </main>
            </div>
          </NavigationProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
