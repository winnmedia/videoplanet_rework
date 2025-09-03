import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

// 개발 환경에서만 환경변수 검증 실행
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  import('@/shared/lib/env-validation').then(({ checkEnvHealth }) => {
    checkEnvHealth()
  }).catch(console.warn)
}

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || 'Video Planet, VLANET',
  description: '전문적인 영상 제작과 피드백을 위한 협업 플랫폼',
  keywords: ['영상', '비디오', '협업', '피드백', '제작'],
  authors: [{ name: 'VideoPlanet Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://vlanet.net',
    title: process.env.NEXT_PUBLIC_APP_NAME || 'Video Planet, VLANET',
    description: '전문적인 영상 제작과 피드백을 위한 협업 플랫폼',
    siteName: process.env.NEXT_PUBLIC_APP || 'VideoPlanet',
  },
  twitter: {
    card: 'summary_large_image',
    title: process.env.NEXT_PUBLIC_APP_NAME || 'Video Planet, VLANET',
    description: '전문적인 영상 제작과 피드백을 위한 협업 플랫폼',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* Resource Hints for Performance Optimization */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_BASE || 'https://api.vlanet.net'} />
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_BACKEND_API || 'https://videoplanet.up.railway.app'} />
        
        {/* DNS Prefetch for External Resources */}
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        
        {/* Preload Critical Resources */}
        <link 
          rel="preload" 
          href="/fonts/inter-var.woff2" 
          as="font" 
          type="font/woff2" 
          crossOrigin="anonymous" 
        />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}