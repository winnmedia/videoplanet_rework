import { clsx } from 'clsx'
import { ReactNode } from 'react'

import { Card } from 'shared/ui'

export interface SearchResultsProps<T = Record<string, unknown>> {
  /** 검색 결과 데이터 */
  results: T[]
  
  /** 결과 렌더링 함수 */
  renderItem: (item: T, index: number) => ReactNode
  
  /** 로딩 상태 */
  loading?: boolean
  
  /** 에러 상태 */
  error?: string | null
  
  /** 빈 결과 메시지 */
  emptyMessage?: string
  
  /** 검색어 */
  searchQuery?: string
  
  /** 총 결과 개수 */
  totalCount?: number
  
  /** 현재 페이지 */
  currentPage?: number
  
  /** 페이지 크기 */
  pageSize?: number
  
  /** 페이지네이션 이벤트 */
  onPageChange?: (page: number) => void
  
  /** 결과 레이아웃 */
  layout?: 'list' | 'grid'
  
  /** 추가 CSS 클래스 */
  className?: string
  
  /** 테스트를 위한 ID */
  'data-testid'?: string
}

function LoadingState({ message = '검색 중...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="animate-pulse-slow text-4xl mb-4">Loading...</div>
      <div className="text-neutral-500">{message}</div>
    </div>
  )
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-4xl mb-4">Error</div>
      <div className="text-red-600 font-medium mb-2">검색 중 오류가 발생했습니다</div>
      <div className="text-sm text-neutral-500">{error}</div>
    </div>
  )
}

function EmptyState({ 
  message = '검색 결과가 없습니다', 
  searchQuery 
}: { 
  message?: string
  searchQuery?: string 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-4xl mb-4">No Results</div>
      <div className="text-neutral-700 font-medium mb-2">{message}</div>
      {searchQuery && (
        <div className="text-sm text-neutral-500">
          &quot;<span className="font-medium">{searchQuery}</span>&quot;에 대한 검색 결과가 없습니다
        </div>
      )}
    </div>
  )
}

function SearchSummary({ 
  totalCount, 
  searchQuery, 
  currentPage, 
  pageSize 
}: {
  totalCount?: number
  searchQuery?: string
  currentPage?: number
  pageSize?: number
}) {
  if (typeof totalCount !== 'number') return null
  
  const startIndex = currentPage && pageSize ? (currentPage - 1) * pageSize + 1 : 1
  const endIndex = currentPage && pageSize 
    ? Math.min(currentPage * pageSize, totalCount)
    : totalCount
  
  return (
    <div className="text-sm text-neutral-600 mb-4">
      {searchQuery && (
        <span>
          &quot;<span className="font-medium">{searchQuery}</span>&quot;에 대한 검색 결과:{' '}
        </span>
      )}
      <span className="font-medium">
        총 {totalCount.toLocaleString()}개
      </span>
      {currentPage && pageSize && totalCount > pageSize && (
        <span> ({startIndex}-{endIndex}번째 항목)</span>
      )}
    </div>
  )
}

function Pagination({ 
  currentPage = 1, 
  totalCount = 0, 
  pageSize = 20, 
  onPageChange 
}: {
  currentPage?: number
  totalCount?: number
  pageSize?: number
  onPageChange?: (page: number) => void
}) {
  if (!onPageChange || totalCount <= pageSize) return null
  
  const totalPages = Math.ceil(totalCount / pageSize)
  const maxVisiblePages = 5
  
  // 표시할 페이지 번호 계산
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1)
  }
  
  const pages = Array.from(
    { length: endPage - startPage + 1 }, 
    (_, i) => startPage + i
  )
  
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className={clsx(
          'px-3 py-2 text-sm font-medium text-neutral-600 bg-neutral-100',
          'hover:bg-neutral-200 focus-ring rounded transition-colors duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        aria-label="이전 페이지"
      >
        이전
      </button>
      
      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          className={clsx(
            'px-3 py-2 text-sm font-medium rounded transition-colors duration-200 focus-ring',
            page === currentPage
              ? 'bg-primary-600 text-white'
              : 'text-neutral-600 bg-neutral-100 hover:bg-neutral-200'
          )}
          aria-label={`${page}페이지`}
          aria-current={page === currentPage ? 'page' : undefined}
        >
          {page}
        </button>
      ))}
      
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={clsx(
          'px-3 py-2 text-sm font-medium text-neutral-600 bg-neutral-100',
          'hover:bg-neutral-200 focus-ring rounded transition-colors duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        aria-label="다음 페이지"
      >
        다음
      </button>
    </div>
  )
}

export function SearchResults<T = Record<string, unknown>>({
  results,
  renderItem,
  loading = false,
  error = null,
  emptyMessage = '검색 결과가 없습니다',
  searchQuery,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  layout = 'list',
  className,
  'data-testid': testId,
}: SearchResultsProps<T>) {
  if (loading) {
    return (
      <Card className={className} data-testid={testId}>
        <LoadingState />
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card className={className} data-testid={testId}>
        <ErrorState error={error} />
      </Card>
    )
  }
  
  if (results.length === 0) {
    return (
      <Card className={className} data-testid={testId}>
        <EmptyState message={emptyMessage} searchQuery={searchQuery} />
      </Card>
    )
  }
  
  const gridClassName = layout === 'grid' 
    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
    : 'space-y-4'
  
  return (
    <div className={clsx('space-y-4', className)} data-testid={testId}>
      <SearchSummary
        totalCount={totalCount}
        searchQuery={searchQuery}
        currentPage={currentPage}
        pageSize={pageSize}
      />
      
      <div className={gridClassName}>
        {results.map((item, index) => (
          <div key={index} className="animate-fade-in">
            {renderItem(item, index)}
          </div>
        ))}
      </div>
      
      <Pagination
        currentPage={currentPage}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={onPageChange}
      />
    </div>
  )
}

export default SearchResults