import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { NavigationProvider } from "@/features/navigation";
import { AuthProvider } from "@/shared/lib/auth";

import { ConditionalHeader } from "./components/ConditionalHeader";
import { StoreProvider } from "../shared/ui/StoreProvider/StoreProvider";

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
        {/* FontAwesome은 로컬 import로만 처리하여 Hydration 오류 방지 */}
        
        {/* Critical Image Preloading - Performance Blocker Fix */}
        {/* Above-the-fold images for LCP optimization */}
        <link
          rel="preload"
          as="image"
          href="/images/Home/new/visual-bg.webp"
          type="image/webp"
          fetchPriority="high"
        />
        <link
          rel="preload"
          as="image" 
          href="/images/User/bg.png"
          type="image/webp"
          fetchPriority="high"
        />
        <link
          rel="preload"
          as="image"
          href="/images/Home/img01.png"
          type="image/webp"
          fetchPriority="high"
        />
        
        {/* Preconnect to optimize image loading */}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
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
        </AuthProvider>
      </body>
    </html>
  );
}
