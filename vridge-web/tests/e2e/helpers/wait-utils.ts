/**
 * E2E 테스트용 대기 유틸리티
 * @description Next.js 앱 초기화 및 컴포넌트 로딩 완료 대기
 */

import { Page, expect } from '@playwright/test'

interface WaitForAppReadyOptions {
  route: string
  anchor?: string
  timeout?: number
  skipHeaderCheck?: boolean
}

/**
 * 앱 초기 로딩 완료까지 대기
 * Next.js dev 서버의 초기 컴파일과 하이드레이션 완료를 확인
 */
export async function waitForAppReady(
  page: Page, 
  options: WaitForAppReadyOptions
): Promise<void> {
  const { route, anchor, timeout = 30000, skipHeaderCheck = false } = options

  try {
    // 1. 기본 네비게이션 완료 대기
    await page.goto(route)
    await page.waitForLoadState('networkidle', { timeout })

    // 2. Next.js 하이드레이션 완료 대기
    await page.waitForFunction(
      () => window.__NEXT_HYDRATED || document.readyState === 'complete',
      { timeout: 10000 }
    ).catch(() => {
      // 하이드레이션 플래그가 없어도 계속 진행 (fallback)
      console.warn('Hydration flag not detected, continuing...')
    })

    // 3. 스켈레톤 로더 사라짐 대기 (있는 경우에만)
    const skeletonSelector = '[data-testid*="skeleton"], .animate-pulse, .skeleton'
    try {
      await page.waitForSelector(skeletonSelector, { state: 'detached', timeout: 5000 })
    } catch {
      // 스켈레톤이 없으면 통과
    }

    // 4. 헤더 로딩 완료 대기 (로그인된 페이지의 경우)
    if (!skipHeaderCheck && !route.includes('/login') && route !== '/') {
      try {
        await page.waitForSelector('[data-testid="main-header"]', { timeout: 5000 })
      } catch {
        // 헤더가 없는 페이지는 통과
      }
    }

    // 5. 지정된 앵커 요소 대기 (있는 경우)
    if (anchor) {
      const anchorSelectors = [
        `[data-testid*="${anchor.toLowerCase()}"]`,
        `text="${anchor}"`,
        `h1:has-text("${anchor}")`,
        `h2:has-text("${anchor}")`,
        `nav:has-text("${anchor}")`,
        `*[aria-label*="${anchor}"]`
      ]

      let anchorFound = false
      for (const selector of anchorSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 })
          anchorFound = true
          break
        } catch {
          continue
        }
      }

      if (!anchorFound) {
        console.warn(`Anchor "${anchor}" not found, but continuing...`)
      }
    }

    // 6. 마지막 안정화 대기 (DOM 변경 완료)
    await page.waitForTimeout(500)

    // 7. 페이지가 실제로 로드되었는지 확인
    await expect(page.locator('body')).toBeVisible()

  } catch (error) {
    console.error(`Failed to wait for app ready on ${route}:`, error)
    throw new Error(`App failed to be ready within ${timeout}ms on ${route}`)
  }
}

/**
 * 특정 컴포넌트 로딩 완료 대기
 */
export async function waitForComponent(
  page: Page,
  testId: string,
  timeout = 10000
): Promise<void> {
  try {
    const selector = `[data-testid="${testId}"]`
    
    // 요소가 DOM에 존재할 때까지 대기
    await page.waitForSelector(selector, { timeout })
    
    // 요소가 실제로 보이는지 확인
    await expect(page.locator(selector)).toBeVisible({ timeout: 5000 })
    
  } catch (error) {
    console.error(`Component with testid "${testId}" failed to load:`, error)
    throw new Error(`Component "${testId}" not ready within ${timeout}ms`)
  }
}

/**
 * API 응답 완료 대기
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 15000
): Promise<void> {
  try {
    const response = await page.waitForResponse(
      response => {
        const url = response.url()
        if (typeof urlPattern === 'string') {
          return url.includes(urlPattern)
        }
        return urlPattern.test(url)
      },
      { timeout }
    )

    // 응답이 성공적인지 확인
    if (!response.ok()) {
      console.warn(`API response not OK: ${response.status()} ${response.url()}`)
    }

  } catch (error) {
    console.error(`API response timeout for pattern: ${urlPattern}`, error)
    throw new Error(`API response not received within ${timeout}ms for ${urlPattern}`)
  }
}

/**
 * 폼 제출 완료 대기
 */
export async function waitForFormSubmission(
  page: Page,
  formSelector = 'form',
  timeout = 10000
): Promise<void> {
  try {
    // 제출 버튼 비활성화 상태 대기 (로딩 중)
    const submitButton = page.locator(`${formSelector} [type="submit"]`)
    await expect(submitButton).toBeDisabled({ timeout: 2000 }).catch(() => {})

    // 제출 완료 후 버튼 다시 활성화 대기
    await expect(submitButton).toBeEnabled({ timeout })

  } catch (error) {
    console.error('Form submission wait failed:', error)
    throw new Error(`Form submission not completed within ${timeout}ms`)
  }
}

/**
 * 모달 열림/닫힘 대기
 */
export async function waitForModal(
  page: Page,
  action: 'open' | 'close',
  modalSelector = '[role="dialog"]',
  timeout = 5000
): Promise<void> {
  try {
    if (action === 'open') {
      await page.waitForSelector(modalSelector, { state: 'visible', timeout })
      // 모달 애니메이션 완료 대기
      await page.waitForTimeout(300)
    } else {
      await page.waitForSelector(modalSelector, { state: 'detached', timeout })
    }
  } catch (error) {
    console.error(`Modal ${action} wait failed:`, error)
    throw new Error(`Modal ${action} not completed within ${timeout}ms`)
  }
}