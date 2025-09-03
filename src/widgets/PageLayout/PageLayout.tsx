'use client'

import Head from 'next/head'
import Link from 'next/link'
import { ReactNode } from 'react'
import { Typography } from '@/shared/ui/Typography/Typography'

export interface BreadcrumbItem {
  label: string
  href: string
}

export interface PageMetadata {
  description?: string
  keywords?: string[]
  image?: string
}

export interface PageLayoutProps {
  title: string
  children: ReactNode
  sidebar?: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  headerActions?: ReactNode
  loading?: boolean
  error?: string
  fullWidth?: boolean
  metadata?: PageMetadata
}

export function PageLayout({
  title,
  children,
  sidebar,
  breadcrumbs,
  headerActions,
  loading,
  error,
  fullWidth = false,
  metadata
}: PageLayoutProps) {
  // 유효한 breadcrumb만 필터링
  const validBreadcrumbs = breadcrumbs?.filter(
    item => item.label && item.label.trim().length > 0
  ) || []

  return (
    <>
      {metadata && (
        <Head>
          <title>{title}</title>
          {metadata.description && (
            <meta name="description" content={metadata.description} />
          )}
          {metadata.keywords && (
            <meta name="keywords" content={metadata.keywords.join(', ')} />
          )}
          {metadata.image && (
            <meta property="og:image" content={metadata.image} />
          )}
        </Head>
      )}

      <div 
        className={`min-h-screen flex flex-col lg:flex-row bg-gray-50`}
        data-testid="page-layout"
      >
        {/* Skip to main content link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-white px-4 py-2 rounded z-50"
        >
          메인 콘텐츠로 건너뛰기
        </a>

        {/* Sidebar */}
        {sidebar && (
          <aside 
            className="w-full lg:w-80 bg-white border-r border-gray-200 hidden lg:block"
            aria-label="사이드바"
          >
            {sidebar}
          </aside>
        )}

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col ${fullWidth ? 'w-full' : 'max-w-7xl mx-auto'}`}>
          {/* Header */}
          <header 
            className="bg-white border-b border-gray-200 px-6 py-4"
            role="banner"
          >
            <div className="flex flex-col space-y-4">
              {/* Breadcrumbs */}
              {validBreadcrumbs.length > 0 && (
                <nav aria-label="breadcrumb">
                  <ol className="flex items-center space-x-2 text-sm text-gray-500">
                    {validBreadcrumbs.map((item, index) => (
                      <li key={index} className="flex items-center">
                        {index > 0 && (
                          <span className="mx-2">/</span>
                        )}
                        {index === validBreadcrumbs.length - 1 ? (
                          <span className="text-gray-900 font-medium">
                            {item.label}
                          </span>
                        ) : (
                          <Link
                            href={item.href}
                            className="hover:text-primary transition-colors"
                          >
                            {item.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              )}

              {/* Page Title and Actions */}
              <div className="flex items-center justify-between">
                <Typography variant="h1" className="text-2xl font-bold text-gray-900">
                  {title}
                </Typography>
                {headerActions && (
                  <div className="flex items-center space-x-2">
                    {headerActions}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main 
            id="main-content"
            className={`flex-1 p-6 ${fullWidth ? 'w-full' : ''}`}
            role="main"
          >
            {/* Loading State */}
            {loading && (
              <div 
                className="flex items-center justify-center py-12"
                role="status"
                aria-label="콘텐츠 로딩 중"
              >
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <Typography variant="body" className="text-gray-600">
                    로딩 중...
                  </Typography>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div 
                className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
                role="alert"
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg 
                      className="h-5 w-5 text-red-400" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <Typography variant="body" className="text-red-800">
                      {error}
                    </Typography>
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            {!loading && !error && children}
          </main>
        </div>
      </div>
    </>
  )
}