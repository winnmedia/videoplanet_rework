/**
 * @fileoverview 초미니멀 Select 컴포넌트 - Tailwind CSS 기반
 * @description VRidge 디자인 시스템의 Select 컴포넌트
 */

'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { useState, useRef, useEffect, useCallback } from 'react'

import { cn } from '../../lib/utils'

// Select variants 정의
const selectVariants = cva(
  [
    'relative w-full',
    'bg-white border rounded',
    'text-base leading-5',
    'transition-all duration-200 ease-out',
    'focus-within:ring-2 focus-within:ring-offset-2'
  ],
  {
    variants: {
      size: {
        sm: 'h-8 text-sm',
        default: 'h-button text-base',
        lg: 'h-button-lg text-lg'
      },
      variant: {
        default: [
          'border-gray-300',
          'focus-within:border-vridge-500 focus-within:ring-vridge-500'
        ],
        error: [
          'border-error-500',
          'focus-within:border-error-500 focus-within:ring-error-500'
        ]
      }
    },
    defaultVariants: {
      size: 'default',
      variant: 'default'
    }
  }
)

const triggerVariants = cva(
  [
    'flex items-center justify-between',
    'w-full h-full px-3 py-2',
    'text-left bg-transparent',
    'cursor-pointer',
    'focus:outline-none',
    'disabled:cursor-not-allowed disabled:opacity-50'
  ]
)

const dropdownVariants = cva(
  [
    'absolute z-dropdown mt-1',
    'w-full max-h-60 overflow-auto',
    'bg-white border border-gray-200 rounded shadow-lg',
    'animate-slide-down'
  ]
)

const optionVariants = cva(
  [
    'flex items-center px-3 py-2',
    'text-base cursor-pointer',
    'transition-colors duration-150 ease-out'
  ],
  {
    variants: {
      selected: {
        true: 'bg-vridge-50 text-vridge-700',
        false: 'text-gray-900 hover:bg-gray-50'
      },
      disabled: {
        true: 'opacity-50 cursor-not-allowed',
        false: 'hover:bg-gray-50'
      }
    },
    defaultVariants: {
      selected: false,
      disabled: false
    }
  }
)

// 옵션 타입 정의
export interface SelectOption {
  label: string
  value: string
  disabled?: boolean
}

export interface SelectProps extends VariantProps<typeof selectVariants> {
  /**
   * 선택 옵션들
   */
  options: SelectOption[]
  
  /**
   * 현재 선택된 값 (단일 또는 다중)
   */
  value?: string | string[]
  
  /**
   * 기본값
   */
  defaultValue?: string | string[]
  
  /**
   * placeholder 텍스트
   */
  placeholder?: string
  
  /**
   * 변경 콜백
   */
  onChange: (value: string | string[], option: SelectOption | SelectOption[]) => void
  
  /**
   * 다중 선택 모드
   */
  multiple?: boolean
  
  /**
   * 검색 가능 여부
   */
  searchable?: boolean
  
  /**
   * 비활성화 상태
   */
  disabled?: boolean
  
  /**
   * 로딩 상태
   */
  loading?: boolean
  
  /**
   * 에러 상태
   */
  error?: boolean
  
  /**
   * 에러 메시지
   */
  errorMessage?: string
  
  /**
   * 빈 상태 메시지
   */
  emptyMessage?: string
  
  /**
   * 접근성 레이블
   */
  'aria-label'?: string
  
  /**
   * 추가 클래스명
   */
  className?: string
}

/**
 * 아이콘 컴포넌트들
 */
const ChevronDownIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    className={cn(
      'w-5 h-5 text-gray-400 transition-transform duration-200',
      isOpen && 'transform rotate-180'
    )}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

const CheckIcon = () => (
  <svg
    className="w-4 h-4 text-vridge-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const XIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const LoadingSpinner = () => (
  <div 
    className="w-5 h-5 animate-spin border-2 border-gray-300 border-t-vridge-500 rounded-full"
    data-testid="loading-spinner"
    role="status"
    aria-hidden="true"
  />
)

/**
 * 선택된 값들을 표시하는 태그 컴포넌트
 */
const SelectedTag = ({ 
  option, 
  onRemove 
}: { 
  option: SelectOption
  onRemove: () => void 
}) => (
  <div
    className="inline-flex items-center gap-1 px-2 py-1 bg-vridge-100 text-vridge-800 text-sm rounded"
    data-testid={`selected-tag-${option.value}`}
  >
    <span className="truncate">{option.label}</span>
    <button
      type="button"
      className="flex-shrink-0 hover:text-vridge-900 focus:outline-none focus:text-vridge-900"
      onClick={(e) => {
        e.stopPropagation()
        onRemove()
      }}
      data-testid={`remove-tag-${option.value}`}
      aria-label={`${option.label} 제거`}
    >
      <XIcon />
    </button>
  </div>
)

/**
 * Select 컴포넌트
 * 
 * @description VRidge 디자인 시스템의 Select 컴포넌트
 * 초미니멀한 디자인과 완벽한 접근성, 다양한 기능을 제공합니다.
 * 
 * @example
 * ```tsx
 * // 기본 선택
 * <Select
 *   placeholder="옵션을 선택하세요"
 *   options={options}
 *   onChange={(value, option) => console.log(value)}
 * />
 * 
 * // 다중 선택
 * <Select
 *   multiple
 *   options={options}
 *   onChange={(values, options) => console.log(values)}
 * />
 * 
 * // 검색 가능
 * <Select
 *   searchable
 *   options={options}
 *   onChange={(value, option) => console.log(value)}
 * />
 * ```
 */
export const Select = ({
  options,
  value,
  defaultValue,
  placeholder = '선택하세요',
  onChange,
  multiple = false,
  searchable = false,
  disabled = false,
  loading = false,
  error = false,
  errorMessage,
  emptyMessage = '옵션이 없습니다',
  size = 'default',
  variant,
  className,
  'aria-label': ariaLabel,
  ...props
}: SelectProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [internalValue, setInternalValue] = useState(value || defaultValue || (multiple ? [] : ''))
  
  const selectRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listboxRef = useRef<HTMLUListElement>(null)

  // 제어된 컴포넌트 vs 비제어된 컴포넌트 처리
  const currentValue = value !== undefined ? value : internalValue

  // 검색어에 따른 필터링된 옵션들
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 현재 선택된 옵션들 가져오기
  const getSelectedOptions = useCallback(() => {
    if (!multiple) {
      return options.find(option => option.value === currentValue) || null
    }
    
    const values = Array.isArray(currentValue) ? currentValue : []
    return options.filter(option => values.includes(option.value))
  }, [options, currentValue, multiple])

  // 값 변경 처리
  const handleValueChange = (newValue: string | string[], newOptions: SelectOption | SelectOption[]) => {
    if (value === undefined) {
      setInternalValue(newValue)
    }
    onChange(newValue, newOptions)
  }

  // 옵션 선택 처리
  const handleOptionClick = (option: SelectOption) => {
    if (option.disabled) return

    if (multiple) {
      const currentValues = Array.isArray(currentValue) ? currentValue : []
      const isSelected = currentValues.includes(option.value)
      
      if (isSelected) {
        // 선택 해제
        const newValues = currentValues.filter(v => v !== option.value)
        const newOptions = options.filter(opt => newValues.includes(opt.value))
        handleValueChange(newValues, newOptions)
      } else {
        // 선택 추가
        const newValues = [...currentValues, option.value]
        const newOptions = options.filter(opt => newValues.includes(opt.value))
        handleValueChange(newValues, newOptions)
      }
    } else {
      // 단일 선택
      handleValueChange(option.value, option)
      setIsOpen(false)
    }
  }

  // 태그 제거 처리 (다중 선택)
  const handleTagRemove = (valueToRemove: string) => {
    if (!multiple) return
    
    const currentValues = Array.isArray(currentValue) ? currentValue : []
    const newValues = currentValues.filter(v => v !== valueToRemove)
    const newOptions = options.filter(opt => newValues.includes(opt.value))
    handleValueChange(newValues, newOptions)
  }

  // 키보드 탐색 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    switch (e.key) {
      case 'Enter':
      case ' ':
        if (!searchable) {
          e.preventDefault()
          setIsOpen(!isOpen)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setFocusedIndex(-1)
        break
      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setFocusedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          )
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (isOpen) {
          setFocusedIndex(prev => 
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          )
        }
        break
    }
  }

  // 외부 클릭 처리
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 포커스된 옵션 스크롤 처리
  useEffect(() => {
    if (focusedIndex >= 0 && listboxRef.current) {
      const focusedElement = listboxRef.current.children[focusedIndex] as HTMLElement
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [focusedIndex])

  // 선택된 값 표시 텍스트
  const getDisplayText = () => {
    const selectedOptions = getSelectedOptions()
    
    if (multiple) {
      const selected = selectedOptions as SelectOption[]
      if (selected.length === 0) return placeholder
      return null // 다중 선택에서는 태그로 표시
    } else {
      const selected = selectedOptions as SelectOption | null
      return selected ? selected.label : placeholder
    }
  }

  // 현재 variant 결정
  const currentVariant = error ? 'error' : variant || 'default'

  return (
    <div className={cn('relative', className)} ref={selectRef}>
      {/* 메인 선택 컨트롤 */}
      <div
        className={cn(selectVariants({ size, variant: currentVariant }))}
        {...props}
      >
        {searchable ? (
          <input
            ref={searchInputRef}
            type="text"
            className={cn(
              triggerVariants(),
              'cursor-text',
              multiple && currentValue && Array.isArray(currentValue) && currentValue.length > 0 && 'pt-8'
            )}
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={() => !disabled && setIsOpen(true)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            role="textbox"
            aria-label={ariaLabel}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-invalid={error}
          />
        ) : (
          <div
            className={cn(triggerVariants())}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            onKeyDown={handleKeyDown}
            tabIndex={disabled ? -1 : 0}
            role="combobox"
            aria-label={ariaLabel}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-disabled={disabled}
            aria-invalid={error}
          >
            <div className="flex-1 truncate">
              {multiple && Array.isArray(currentValue) && currentValue.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {(getSelectedOptions() as SelectOption[]).map((option) => (
                    <SelectedTag
                      key={option.value}
                      option={option}
                      onRemove={() => handleTagRemove(option.value)}
                    />
                  ))}
                </div>
              ) : (
                <span className={cn(
                  !getDisplayText() && 'text-gray-500'
                )}>
                  {getDisplayText()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 우측 아이콘 */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center">
          {loading ? (
            <LoadingSpinner />
          ) : (
            <ChevronDownIcon isOpen={isOpen} />
          )}
        </div>
      </div>

      {/* 드롭다운 목록 */}
      {isOpen && (
        <ul
          ref={listboxRef}
          className={dropdownVariants()}
          role="listbox"
          aria-multiselectable={multiple}
        >
          {filteredOptions.length === 0 ? (
            <li className="px-3 py-2 text-gray-500 text-center">
              {emptyMessage}
            </li>
          ) : (
            filteredOptions.map((option, index) => {
              const isSelected = multiple
                ? Array.isArray(currentValue) && currentValue.includes(option.value)
                : currentValue === option.value
              const isFocused = index === focusedIndex

              return (
                <li
                  key={option.value}
                  className={cn(
                    optionVariants({ selected: isSelected, disabled: option.disabled }),
                    isFocused && 'bg-gray-100'
                  )}
                  onClick={() => handleOptionClick(option)}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled}
                  tabIndex={-1}
                >
                  <span className="flex-1 truncate">{option.label}</span>
                  {isSelected && <CheckIcon />}
                </li>
              )
            })
          )}
        </ul>
      )}

      {/* 에러 메시지 */}
      {error && errorMessage && (
        <p className="mt-1 text-sm text-error-600" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  )
}

Select.displayName = 'Select'