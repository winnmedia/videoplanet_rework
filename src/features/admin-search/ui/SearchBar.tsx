import { useState, useCallback, ChangeEvent, KeyboardEvent } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'

const searchBarVariants = cva(
  'flex items-center gap-2 bg-background-card border border-border-light rounded-admin transition-colors focus-within:border-border-focus',
  {
    variants: {
      size: {
        sm: 'px-3 py-2',
        md: 'px-4 py-3',
        lg: 'px-6 py-4',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      fullWidth: true,
    },
  }
)

export interface SearchBarProps extends VariantProps<typeof searchBarVariants> {
  /** 검색어 */
  value: string
  
  /** 검색어 변경 이벤트 */
  onChange: (value: string) => void
  
  /** 검색 실행 이벤트 */
  onSearch?: (value: string) => void
  
  /** 플레이스홀더 텍스트 */
  placeholder?: string
  
  /** 로딩 상태 */
  loading?: boolean
  
  /** 비활성화 상태 */
  disabled?: boolean
  
  /** 검색 지연 시간 (ms) */
  debounceMs?: number
  
  /** 추가 CSS 클래스 */
  className?: string
  
  /** 테스트를 위한 ID */
  'data-testid'?: string
}

export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = '검색어를 입력하세요',
  loading = false,
  disabled = false,
  debounceMs = 300,
  size,
  fullWidth,
  className,
  'data-testid': testId,
}: SearchBarProps) {
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)
  
  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    
    // 디바운스 처리
    if (onSearch && debounceMs > 0) {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      
      const timer = setTimeout(() => {
        onSearch(newValue)
      }, debounceMs)
      
      setDebounceTimer(timer)
    }
  }, [onChange, onSearch, debounceMs, debounceTimer])
  
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      e.preventDefault()
      if (debounceTimer) {
        clearTimeout(debounceTimer)
        setDebounceTimer(null)
      }
      onSearch(value)
    }
  }, [onSearch, value, debounceTimer])
  
  const handleSearchClick = useCallback(() => {
    if (onSearch) {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
        setDebounceTimer(null)
      }
      onSearch(value)
    }
  }, [onSearch, value, debounceTimer])
  
  const handleClear = useCallback(() => {
    onChange('')
    if (onSearch) {
      onSearch('')
    }
  }, [onChange, onSearch])
  
  return (
    <div
      className={clsx(searchBarVariants({ size, fullWidth }), className)}
      data-testid={testId}
    >
      {/* 검색 아이콘 */}
      <div className="flex-shrink-0 text-neutral-400" aria-hidden="true">
        🔍
      </div>
      
      {/* 입력 필드 */}
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || loading}
        className={clsx(
          'flex-1 bg-transparent border-none outline-none text-sm text-neutral-900 placeholder-neutral-400',
          'focus:ring-0 focus:border-transparent'
        )}
        aria-label="검색"
        data-testid={testId ? `${testId}-input` : undefined}
      />
      
      {/* 로딩 스피너 */}
      {loading && (
        <div 
          className="flex-shrink-0 text-neutral-400 animate-pulse-slow"
          aria-label="검색 중"
        >
          ⏳
        </div>
      )}
      
      {/* 지우기 버튼 */}
      {value && !loading && (
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          className={clsx(
            'flex-shrink-0 p-1 text-neutral-400 hover:text-neutral-600 focus-ring rounded',
            'transition-colors duration-200'
          )}
          aria-label="검색어 지우기"
          data-testid={testId ? `${testId}-clear` : undefined}
        >
          ✕
        </button>
      )}
      
      {/* 검색 버튼 (선택적) */}
      {onSearch && (
        <button
          type="button"
          onClick={handleSearchClick}
          disabled={disabled || loading}
          className={clsx(
            'flex-shrink-0 px-3 py-1 text-sm font-medium text-white bg-primary-600',
            'hover:bg-primary-700 focus-ring rounded transition-colors duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          aria-label="검색 실행"
          data-testid={testId ? `${testId}-button` : undefined}
        >
          검색
        </button>
      )}
    </div>
  )
}

export default SearchBar