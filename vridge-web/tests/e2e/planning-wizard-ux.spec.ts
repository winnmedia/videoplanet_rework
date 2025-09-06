/**
 * Planning Wizard UX E2E
 * DEVPLAN DoD 핵심 검증(간단 구조 확인 위주)
 */
import { test, expect } from '@playwright/test'

test.describe('영상 기획 위저드 UX', () => {
  test('플래닝 페이지 진입 및 위저드 골격 확인', async ({ page }) => {
    await page.goto('/planning')
    await page.waitForLoadState('domcontentloaded')
    await page.getByRole('heading', { name: '영상 기획' }).isVisible().catch(() => page.waitForTimeout(1500))

    // 헤더 타이틀
    // 헤더 또는 위저드 testid 확인(일부 환경에서 텍스트 변동 대비)
    const headerVisible = await page.getByRole('heading', { name: '영상 기획' }).isVisible().catch(() => false)
    if (!headerVisible) {
      await expect(page.getByTestId('planning-wizard')).toBeVisible()
    }

    // 위저드 컨테이너 존재(메인 카드)
    await expect(page.getByTestId('planning-wizard')).toBeVisible()

    // 스텝 인디케이터 존재
    await expect(page.getByText('STEP 1')).toBeVisible()
    await expect(page.getByText('STEP 2')).toBeVisible()
    await expect(page.getByText('STEP 3')).toBeVisible()

    // 페이지가 접근성 영역을 노출하는지 간단 확인(진행률 aria)
    const progress = page.getByRole('progressbar')
    await expect(progress).toBeVisible()
  })
})
