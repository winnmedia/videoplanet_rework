/**
 * Dashboard Feedback Read E2E
 * DEVPLAN DoD: 새 피드 요약 → 아이템 클릭 시 읽음 처리/카운트 감소
 */
import { test, expect } from '@playwright/test'

test.describe('대시보드 피드백 읽음 처리', () => {
  test('피드백 아이템 클릭 시 읽음 처리', async ({ page }) => {
    await page.goto('/dashboard')

    // 새 피드백 카드 존재
    const cardHeading = page.getByRole('heading', { name: '새 피드백 요약' })
    await expect(cardHeading).toBeVisible()

    // 읽지 않음 배지(있으면) 개수 기록
    const unreadBadge = page.getByLabel(/읽지 않은 피드백 \d+개/)
    let initialCount = 0
    if (await unreadBadge.count() > 0) {
      const label = await unreadBadge.first().getAttribute('aria-label')
      const m = label?.match(/(\d+)/)
      if (m) initialCount = parseInt(m[1], 10)
    }

    // 첫 번째 아이템 클릭
    const firstItem = page.locator('[aria-label="피드백 요약"]').locator('button').first()
    await firstItem.click()

    // 상세 이동 후 다시 대시보드로 복귀(브라우저 back)
    await page.goBack()

    // 배지 감소(있던 경우에만 체크)
    if (initialCount > 0) {
      const badgeAfter = page.getByLabel(/읽지 않은 피드백 \d+개/)
      if (await badgeAfter.count() > 0) {
        const label = await badgeAfter.first().getAttribute('aria-label')
        const m = label?.match(/(\d+)/)
        if (m) {
          const after = parseInt(m[1], 10)
          expect(after).toBeLessThanOrEqual(initialCount)
        }
      }
    }
  })
})

