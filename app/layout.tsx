import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/shared/ui/StoreProvider/StoreProvider";
import { NavigationProvider } from "@/features/navigation/ui/NavigationProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VLANET - 영상 협업툴",
  description: "VLANET - 영상 제작 및 협업을 위한 프로페셔널 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.variable} antialiased`}>
        <StoreProvider>
          <NavigationProvider>
            {children}
          </NavigationProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
