/**
 * @fileoverview 초미니멀 Layout 컴포넌트 - Tailwind CSS 기반
 * @description VRidge 디자인 시스템의 핵심 Layout 컴포넌트
 */

'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { ReactNode, HTMLAttributes } from 'react'

import { cn } from '../../lib/utils'

// Layout variants 정의
const layoutVariants = cva(
  [
    'min-h-screen',
    'bg-white dark:bg-gray-900',
    'transition-colors duration-200 ease-out'
  ],
  {
    variants: {
      layout: {
        default: 'block',
        sidebar: 'grid grid-cols-sidebar',
        'sidebar-collapsed': 'grid grid-cols-sidebar-collapsed',
        fullscreen: 'block'
      }
    },
    defaultVariants: {
      layout: 'default'
    }
  }
)

const mainVariants = cva(
  [
    'flex-1',
    'transition-all duration-200 ease-out',
    'focus:outline-none'
  ],
  {
    variants: {
      maxWidth: {
        none: '',
        container: 'max-w-container mx-auto',
        narrow: 'max-w-narrow mx-auto',
        full: 'w-full'
      },
      padding: {
        none: '',
        sm: 'p-4',
        md: 'p-4 md:p-6',
        lg: 'p-4 md:p-6 lg:p-8',
        xl: 'p-4 md:p-6 lg:p-8 xl:p-12'
      }
    },
    defaultVariants: {
      maxWidth: 'full',
      padding: 'lg'
    }
  }
)

export interface LayoutProps 
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof layoutVariants>,
    Pick<VariantProps<typeof mainVariants>, 'maxWidth'> {
  /**
   * 메인 콘텐츠
   */
  children: ReactNode
  
  /**
   * 헤더 컴포넌트
   */
  header?: ReactNode
  
  /**
   * 사이드바 컴포넌트
   */
  sidebar?: ReactNode
  
  /**
   * 사이드바 축소 상태
   */
  sidebarCollapsed?: boolean
  
  /**
   * 로딩 상태
   */
  loading?: boolean
  
  /**
   * 패딩 설정
   */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  
  /**
   * 최대 너비 제한
   */
  maxWidth?: 'none' | 'container' | 'narrow' | 'full'
}

/**
 * 스켈레톤 로더 컴포넌트
 */
const LayoutSkeleton = () => (
  <div 
    data-testid="layout-skeleton"
    className="animate-pulse p-4 md:p-6 lg:p-8"
    role="status" 
    aria-label="콘텐츠 로딩 중"
  >
    <div className="space-y-6">
      {/* 헤더 스켈레톤 */}
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
      
      {/* 콘텐츠 스켈레톤 */}
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
      </div>
      
      {/* 카드들 스켈레톤 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
        ))}
      </div>
    </div>
  </div>
)

/**
 * Layout 컴포넌트
 * 
 * @description VRidge 디자인 시스템의 핵심 Layout 컴포넌트
 * 초미니멀한 디자인과 완벽한 반응형, 접근성을 제공합니다.
 * 
 * @example
 * ```tsx
 * // 기본 레이아웃
 * <Layout>
 *   <div>메인 콘텐츠</div>
 * </Layout>
 * 
 * // 사이드바가 있는 레이아웃
 * <Layout 
 *   sidebar={<SideBar />}
 *   header={<Header />}
 * >
 *   <div>메인 콘텐츠</div>
 * </Layout>
 * 
 * // 컨테이너 최대 너비 제한
 * <Layout maxWidth="container">
 *   <div>제한된 너비의 콘텐츠</div>
 * </Layout>
 * ```
 */
export const Layout = ({
  className,
  children,
  header,
  sidebar,
  sidebarCollapsed = false,
  loading = false,
  padding = 'lg',
  maxWidth = 'full',
  ...props
}: LayoutProps) => {
  // 레이아웃 타입 결정
  const getLayoutType = (): 'default' | 'sidebar' | 'sidebar-collapsed' => {
    if (!sidebar) return 'default'
    return sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar'
  }

  const layoutType = getLayoutType()

  return (
    <div 
      className={cn(
        layoutVariants({ layout: layoutType }),
        className
      )}
      {...props}
    >
      {/* 헤더 영역 */}
      {header && (
        <div className="col-span-full">
          {header}
        </div>
      )}
      
      {/* 사이드바 영역 */}
      {sidebar && (
        <aside 
          className={cn(
            'h-full',
            'transition-all duration-200 ease-out',
            sidebarCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
          )}
          role="complementary"
          aria-label="Site Navigation"
        >
          {sidebar}
        </aside>
      )}
      
      {/* 메인 콘텐츠 영역 */}
      <main
        className={cn(
          mainVariants({ maxWidth, padding: padding }),
          'min-h-content',
          'overflow-x-hidden',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vridge-500'
        )}
        role="main"
        aria-label="Main Content"
        tabIndex={-1}
      >
        {loading ? (
          <LayoutSkeleton />
        ) : (
          <div className="w-full h-full animate-fade-in">
            {children}
          </div>
        )}
      </main>
    </div>
  )
}

Layout.displayName = 'Layout'