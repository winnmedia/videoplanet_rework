import { ReactNode, MouseEvent, KeyboardEvent } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'

const adminTableVariants = cva(
  'w-full table-auto-fit border-collapse bg-background-card',
  {
    variants: {
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
      variant: {
        default: 'border border-border-light',
        bordered: 'border-2 border-border-medium',
        striped: 'border border-border-light',
      },
      density: {
        compact: '',
        comfortable: '',
        spacious: '',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
      density: 'comfortable',
    },
  }
)

export interface Column<T = any> {
  /** 컬럼 키 */
  key: string
  /** 컬럼 헤더 제목 */
  title: string
  /** 데이터 렌더링 함수 */
  render?: (value: any, record: T, index: number) => ReactNode
  /** 컬럼 너비 */
  width?: string | number
  /** 정렬 가능 여부 */
  sortable?: boolean
  /** 컬럼 정렬 방향 */
  sortDirection?: 'asc' | 'desc'
  /** 컬럼 정렬 함수 */
  sorter?: (a: T, b: T) => number
  /** 컬럼 필터 */
  filters?: Array<{ text: string; value: any }>
  /** 컬럼 고정 */
  fixed?: 'left' | 'right'
  /** 접근성을 위한 설명 */
  description?: string
}

export interface AdminTableProps<T = any> extends VariantProps<typeof adminTableVariants> {
  /** 테이블 컬럼 정의 */
  columns: Column<T>[]
  /** 테이블 데이터 */
  dataSource: T[]
  /** 행 키 추출 함수 */
  rowKey?: (record: T) => string | number
  /** 로딩 상태 */
  loading?: boolean
  /** 빈 데이터 메시지 */
  emptyText?: string
  /** 행 클릭 이벤트 */
  onRowClick?: (record: T, index: number) => void
  /** 컬럼 정렬 변경 이벤트 */
  onSortChange?: (key: string, direction: 'asc' | 'desc' | null) => void
  /** 추가 CSS 클래스 */
  className?: string
  /** 접근성을 위한 캡션 */
  caption?: string
  /** 테스트를 위한 ID */
  'data-testid'?: string
}

function AdminTableHeader<T>({
  columns,
  onSortChange,
  density,
}: {
  columns: Column<T>[]
  onSortChange?: AdminTableProps<T>['onSortChange']
  density: 'compact' | 'comfortable' | 'spacious'
}) {
  const getCellPadding = () => {
    switch (density) {
      case 'compact': return 'px-3 py-2'
      case 'comfortable': return 'px-4 py-3'
      case 'spacious': return 'px-6 py-4'
      default: return 'px-4 py-3'
    }
  }

  const handleSort = (column: Column<T>) => {
    if (!column.sortable || !onSortChange) return

    let newDirection: 'asc' | 'desc' | null = 'asc'
    if (column.sortDirection === 'asc') {
      newDirection = 'desc'
    } else if (column.sortDirection === 'desc') {
      newDirection = null
    }

    onSortChange(column.key, newDirection)
  }

  const handleKeyDown = (e: KeyboardEvent, column: Column<T>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleSort(column)
    }
  }

  return (
    <thead className="bg-neutral-50 border-b border-border-light">
      <tr>
        {columns.map((column) => (
          <th
            key={column.key}
            className={clsx(
              getCellPadding(),
              'text-left font-semibold text-neutral-900 border-r border-border-light last:border-r-0',
              column.sortable && 'cursor-pointer hover:bg-neutral-100 focus-ring',
              column.width && `w-${column.width}`
            )}
            style={typeof column.width === 'number' ? { width: column.width } : undefined}
            onClick={() => column.sortable && handleSort(column)}
            onKeyDown={(e) => column.sortable && handleKeyDown(e, column)}
            tabIndex={column.sortable ? 0 : -1}
            role={column.sortable ? 'button' : undefined}
            aria-sort={
              column.sortable
                ? column.sortDirection === 'asc'
                  ? 'ascending'
                  : column.sortDirection === 'desc'
                  ? 'descending'
                  : 'none'
                : undefined
            }
            aria-label={
              column.sortable
                ? `${column.title} 컬럼 정렬${
                    column.sortDirection ? ` (현재: ${column.sortDirection === 'asc' ? '오름차순' : '내림차순'})` : ''
                  }`
                : column.title
            }
            title={column.description}
          >
            <div className="flex items-center gap-2">
              <span>{column.title}</span>
              {column.sortable && (
                <span className="text-xs text-neutral-400">
                  {!column.sortDirection && '⇅'}
                  {column.sortDirection === 'asc' && '↑'}
                  {column.sortDirection === 'desc' && '↓'}
                </span>
              )}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  )
}

function AdminTableBody<T>({
  columns,
  dataSource,
  rowKey,
  onRowClick,
  density,
  variant,
}: {
  columns: Column<T>[]
  dataSource: T[]
  rowKey: (record: T) => string | number
  onRowClick?: AdminTableProps<T>['onRowClick']
  density: 'compact' | 'comfortable' | 'spacious'
  variant: 'default' | 'bordered' | 'striped'
}) {
  const getCellPadding = () => {
    switch (density) {
      case 'compact': return 'px-3 py-2'
      case 'comfortable': return 'px-4 py-3'
      case 'spacious': return 'px-6 py-4'
      default: return 'px-4 py-3'
    }
  }

  const handleRowClick = (record: T, index: number) => {
    if (onRowClick) {
      onRowClick(record, index)
    }
  }

  const handleRowKeyDown = (e: KeyboardEvent, record: T, index: number) => {
    if ((e.key === 'Enter' || e.key === ' ') && onRowClick) {
      e.preventDefault()
      onRowClick(record, index)
    }
  }

  return (
    <tbody>
      {dataSource.map((record, index) => (
        <tr
          key={rowKey(record)}
          className={clsx(
            'border-b border-border-light last:border-b-0',
            variant === 'striped' && index % 2 === 0 && 'bg-neutral-25',
            variant === 'striped' && index % 2 === 1 && 'bg-white',
            onRowClick && 'cursor-pointer hover:bg-neutral-50 focus-ring'
          )}
          onClick={() => onRowClick && handleRowClick(record, index)}
          onKeyDown={(e) => onRowClick && handleRowKeyDown(e, record, index)}
          tabIndex={onRowClick ? 0 : -1}
          role={onRowClick ? 'button' : undefined}
          aria-label={onRowClick ? `테이블 행 ${index + 1} 선택` : undefined}
        >
          {columns.map((column) => (
            <td
              key={column.key}
              className={clsx(
                getCellPadding(),
                'text-neutral-700 border-r border-border-light last:border-r-0'
              )}
            >
              {column.render
                ? column.render(record[column.key as keyof T], record, index)
                : String(record[column.key as keyof T] || '')}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

export function AdminTable<T = any>({
  columns,
  dataSource,
  rowKey = (record: T) => (record as any).id || (record as any).key || Math.random(),
  loading = false,
  emptyText = '데이터가 없습니다',
  onRowClick,
  onSortChange,
  size,
  variant,
  density,
  className,
  caption,
  'data-testid': testId,
  ...props
}: AdminTableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid={`${testId}-loading`}>
        <div className="animate-pulse-slow text-neutral-500">로딩 중...</div>
      </div>
    )
  }

  if (dataSource.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-neutral-500" data-testid={`${testId}-empty`}>
        {emptyText}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table
        className={clsx(adminTableVariants({ size, variant, density }), className)}
        data-testid={testId}
        {...props}
      >
        {caption && <caption className="sr-only">{caption}</caption>}
        <AdminTableHeader
          columns={columns}
          onSortChange={onSortChange}
          density={density || 'comfortable'}
        />
        <AdminTableBody
          columns={columns}
          dataSource={dataSource}
          rowKey={rowKey}
          onRowClick={onRowClick}
          density={density || 'comfortable'}
          variant={variant || 'default'}
        />
      </table>
    </div>
  )
}

export default AdminTable