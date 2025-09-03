/**
 * 접근성 유틸리티 및 헬퍼 함수
 * WCAG 2.1 AA 기준 준수를 위한 도구들
 */

// 키보드 네비게이션 키 정의
export const KEYBOARD_KEYS = {
  TAB: 'Tab',
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const

// ARIA 속성 타입
export interface AriaAttributes {
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-expanded'?: boolean
  'aria-hidden'?: boolean
  'aria-live'?: 'off' | 'polite' | 'assertive'
  'aria-atomic'?: boolean
  'aria-busy'?: boolean
  'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time'
  'aria-disabled'?: boolean
  'aria-invalid'?: boolean | 'grammar' | 'spelling'
  'aria-required'?: boolean
  'aria-selected'?: boolean
  'aria-pressed'?: boolean
  'aria-checked'?: boolean | 'mixed'
  'aria-orientation'?: 'horizontal' | 'vertical'
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog'
  'aria-controls'?: string
  'aria-owns'?: string
  'aria-activedescendant'?: string
  'aria-modal'?: boolean
  'aria-multiselectable'?: boolean
  'aria-readonly'?: boolean
  'aria-sort'?: 'ascending' | 'descending' | 'none' | 'other'
  'aria-valuemin'?: number
  'aria-valuemax'?: number
  'aria-valuenow'?: number
  'aria-valuetext'?: string
  'aria-setsize'?: number
  'aria-posinset'?: number
  role?: string
}

// 색상 대비 검사
export function checkColorContrast(
  foregroundColor: string,
  backgroundColor: string,
  fontSize: number = 16
): { ratio: number; isCompliant: boolean; level: 'AA' | 'AAA' | 'FAIL' } {
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null
  }

  const getLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  const fg = hexToRgb(foregroundColor)
  const bg = hexToRgb(backgroundColor)

  if (!fg || !bg) {
    throw new Error('Invalid color format. Use hex format (#RRGGBB)')
  }

  const fgLum = getLuminance(fg.r, fg.g, fg.b)
  const bgLum = getLuminance(bg.r, bg.g, bg.b)

  const ratio = (Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05)

  // WCAG 기준
  const isLargeText = fontSize >= 18 || (fontSize >= 14 && true) // 굵은 글씨 가정
  const aaThreshold = isLargeText ? 3 : 4.5
  const aaaThreshold = isLargeText ? 4.5 : 7

  let level: 'AA' | 'AAA' | 'FAIL'
  if (ratio >= aaaThreshold) level = 'AAA'
  else if (ratio >= aaThreshold) level = 'AA'
  else level = 'FAIL'

  return {
    ratio: Math.round(ratio * 100) / 100,
    isCompliant: ratio >= aaThreshold,
    level,
  }
}

// 키보드 트랩 관리
export class KeyboardTrapManager {
  private trapStack: HTMLElement[] = []

  trapFocus(element: HTMLElement): void {
    // 이전 트랩 비활성화
    if (this.trapStack.length > 0) {
      this.releaseFocus(this.trapStack[this.trapStack.length - 1])
    }

    this.trapStack.push(element)
    this.activateTrap(element)
  }

  releaseFocus(element: HTMLElement): void {
    const index = this.trapStack.indexOf(element)
    if (index !== -1) {
      this.trapStack.splice(index, 1)
      this.deactivateTrap(element)

      // 이전 트랩 재활성화
      if (this.trapStack.length > 0) {
        this.activateTrap(this.trapStack[this.trapStack.length - 1])
      }
    }
  }

  private activateTrap(element: HTMLElement): void {
    const focusableElements = this.getFocusableElements(element)
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key !== KEYBOARD_KEYS.TAB) return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    element.addEventListener('keydown', handleKeydown)
    element.dataset.trapActive = 'true'
    
    // 저장해둠 (나중에 제거용)
    ;(element as any).__trapHandler = handleKeydown

    // 첫 번째 요소에 포커스
    firstElement.focus()
  }

  private deactivateTrap(element: HTMLElement): void {
    const handler = (element as any).__trapHandler
    if (handler) {
      element.removeEventListener('keydown', handler)
      delete (element as any).__trapHandler
    }
    delete element.dataset.trapActive
  }

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input[type="text"]:not([disabled])',
      'input[type="radio"]:not([disabled])',
      'input[type="checkbox"]:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(',')

    return Array.from(container.querySelectorAll(focusableSelectors)).filter(
      (el) => {
        const element = el as HTMLElement
        return (
          element.offsetWidth > 0 ||
          element.offsetHeight > 0 ||
          element === document.activeElement
        )
      }
    ) as HTMLElement[]
  }
}

// 전역 키보드 트랩 매니저 인스턴스
export const keyboardTrapManager = new KeyboardTrapManager()

// 스크린 리더 전용 텍스트 관리
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only' // 스크린 리더 전용 CSS 클래스
  announcement.textContent = message

  document.body.appendChild(announcement)

  // 메시지 읽은 후 제거
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

// 접근 가능한 모달 다이얼로그 관리
export class AccessibleModal {
  private modal: HTMLElement
  private trigger: HTMLElement | null
  private onClose?: () => void

  constructor(modal: HTMLElement, onClose?: () => void) {
    this.modal = modal
    this.onClose = onClose
    this.trigger = document.activeElement as HTMLElement
  }

  open(): void {
    // 모달에 포커스 트랩 설정
    keyboardTrapManager.trapFocus(this.modal)

    // 모달 외부 클릭 처리
    const handleOutsideClick = (e: MouseEvent) => {
      if (!this.modal.contains(e.target as Node)) {
        this.close()
      }
    }

    // ESC 키 처리
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === KEYBOARD_KEYS.ESCAPE) {
        this.close()
      }
    }

    document.addEventListener('click', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    // 정리 함수 저장
    ;(this.modal as any).__outsideClickHandler = handleOutsideClick
    ;(this.modal as any).__escapeHandler = handleEscape

    // 스크린 리더에 모달 열림 알림
    announceToScreenReader('모달 대화상자가 열렸습니다.', 'assertive')

    // 배경을 스크린 리더에서 숨김
    document.body.setAttribute('aria-hidden', 'true')
    this.modal.removeAttribute('aria-hidden')
  }

  close(): void {
    // 포커스 트랩 해제
    keyboardTrapManager.releaseFocus(this.modal)

    // 이벤트 리스너 제거
    const outsideClickHandler = (this.modal as any).__outsideClickHandler
    const escapeHandler = (this.modal as any).__escapeHandler

    if (outsideClickHandler) {
      document.removeEventListener('click', outsideClickHandler)
      delete (this.modal as any).__outsideClickHandler
    }

    if (escapeHandler) {
      document.removeEventListener('keydown', escapeHandler)
      delete (this.modal as any).__escapeHandler
    }

    // 원래 트리거에 포커스 복원
    if (this.trigger) {
      this.trigger.focus()
    }

    // 배경 접근성 복원
    document.body.removeAttribute('aria-hidden')
    this.modal.setAttribute('aria-hidden', 'true')

    // 스크린 리더에 모달 닫힘 알림
    announceToScreenReader('모달 대화상자가 닫혔습니다.', 'assertive')

    // 콜백 실행
    if (this.onClose) {
      this.onClose()
    }
  }
}

// 접근성 검증 유틸리티
export const accessibility = {
  // 요소가 키보드로 접근 가능한지 확인
  isKeyboardAccessible(element: HTMLElement): boolean {
    const tabIndex = element.tabIndex
    const isInteractive = [
      'a', 'button', 'input', 'select', 'textarea'
    ].includes(element.tagName.toLowerCase())
    
    return tabIndex >= 0 || (isInteractive && tabIndex !== -1)
  },

  // 요소에 적절한 ARIA 라벨이 있는지 확인
  hasAccessibleName(element: HTMLElement): boolean {
    return !!(
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      element.textContent?.trim() ||
      element.getAttribute('alt') ||
      element.getAttribute('title')
    )
  },

  // 요소가 스크린 리더에서 숨겨져 있는지 확인
  isHiddenFromScreenReader(element: HTMLElement): boolean {
    return (
      element.getAttribute('aria-hidden') === 'true' ||
      element.style.display === 'none' ||
      element.style.visibility === 'hidden' ||
      element.hasAttribute('hidden')
    )
  },

  // 색상 대비 검사 (간단한 버전)
  checkContrast: checkColorContrast,

  // 스크린 리더 알림
  announce: announceToScreenReader,
}

// 접근성 위반사항 자동 감지
export function detectAccessibilityIssues(container: HTMLElement = document.body): {
  missingAltText: HTMLImageElement[]
  poorColorContrast: HTMLElement[]
  missingLabels: HTMLInputElement[]
  keyboardInaccessible: HTMLElement[]
} {
  const issues = {
    missingAltText: [] as HTMLImageElement[],
    poorColorContrast: [] as HTMLElement[],
    missingLabels: [] as HTMLInputElement[],
    keyboardInaccessible: [] as HTMLElement[],
  }

  // 이미지 alt 텍스트 검사
  const images = container.querySelectorAll('img')
  images.forEach((img) => {
    if (!img.alt && !img.getAttribute('aria-hidden')) {
      issues.missingAltText.push(img)
    }
  })

  // 입력 필드 라벨 검사
  const inputs = container.querySelectorAll('input, textarea, select')
  inputs.forEach((input) => {
    const inputElement = input as HTMLInputElement
    if (!accessibility.hasAccessibleName(inputElement)) {
      issues.missingLabels.push(inputElement)
    }
  })

  // 키보드 접근성 검사
  const interactiveElements = container.querySelectorAll('button, a, [onclick]')
  interactiveElements.forEach((element) => {
    const htmlElement = element as HTMLElement
    if (!accessibility.isKeyboardAccessible(htmlElement)) {
      issues.keyboardInaccessible.push(htmlElement)
    }
  })

  return issues
}