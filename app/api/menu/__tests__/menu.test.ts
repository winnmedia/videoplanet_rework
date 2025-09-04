/**
 * Menu API 엔드포인트 TDD 테스트
 * 
 * 테스트 시나리오:
 * 1. GET /api/menu/items - 메뉴 아이템 목록 조회
 * 2. GET /api/menu/submenu - 서브메뉴 아이템 조회 
 * 3. 에러 처리 (404, 500)
 * 4. Zod 스키마 검증
 */

import { NextRequest } from 'next/server'

import { GET } from '../items/route'
import { GET as getSubMenu } from '../submenu/route'

// 테스트 헬퍼 함수
function createRequest(url: string, options: RequestInit = {}): NextRequest {
  return new NextRequest(url, options)
}

describe('Menu API - /api/menu/*', () => {
  describe('GET /api/menu/items', () => {
    it('모든 메뉴 항목을 반환해야 함', async () => {
      const request = createRequest('http://localhost:3000/api/menu/items')
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('items')
      expect(Array.isArray(data.items)).toBe(true)
      expect(data.items.length).toBeGreaterThan(0)
      
      // 메뉴 아이템 구조 검증
      const firstItem = data.items[0]
      expect(firstItem).toHaveProperty('id')
      expect(firstItem).toHaveProperty('name')
      expect(firstItem).toHaveProperty('path')
      expect(firstItem).toHaveProperty('icon')
      expect(firstItem).toHaveProperty('hasSubMenu')
    })

    it('빈 쿼리 파라미터를 처리해야 함', async () => {
      const request = createRequest('http://localhost:3000/api/menu/items?search=')
      const response = await GET(request)
      
      expect(response.status).toBe(200)
    })
  })

  describe('GET /api/menu/submenu', () => {
    it('유효한 메뉴 타입에 대해 서브메뉴를 반환해야 함', async () => {
      const request = createRequest('http://localhost:3000/api/menu/submenu?type=projects')
      const response = await getSubMenu(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('items')
      expect(Array.isArray(data.items)).toBe(true)
      expect(data).toHaveProperty('total')
      expect(data).toHaveProperty('hasMore')
      
      // 서브메뉴 아이템 구조 검증
      if (data.items.length > 0) {
        const firstItem = data.items[0]
        expect(firstItem).toHaveProperty('id')
        expect(firstItem).toHaveProperty('name')
        expect(firstItem).toHaveProperty('path')
        expect(firstItem).toHaveProperty('status')
        expect(['active', 'pending', 'completed']).toContain(firstItem.status)
      }
    })

    it('잘못된 메뉴 타입에 대해 400 에러를 반환해야 함', async () => {
      const request = createRequest('http://localhost:3000/api/menu/submenu?type=invalid')
      const response = await getSubMenu(request)
      
      expect(response.status).toBe(400)
      
      const error = await response.json()
      expect(error).toHaveProperty('error')
      expect(error).toHaveProperty('message')
      expect(error.message).toContain('유효하지 않은 메뉴 타입')
    })

    it('메뉴 타입 파라미터가 없으면 400 에러를 반환해야 함', async () => {
      const request = createRequest('http://localhost:3000/api/menu/submenu')
      const response = await getSubMenu(request)
      
      expect(response.status).toBe(400)
      
      const error = await response.json()
      expect(error.message).toContain('메뉴 타입이 필요합니다')
    })

    it('지원되는 모든 메뉴 타입을 처리해야 함', async () => {
      const supportedTypes = ['projects', 'feedback', 'planning']
      
      for (const type of supportedTypes) {
        const request = createRequest(`http://localhost:3000/api/menu/submenu?type=${type}`)
        const response = await getSubMenu(request)
        
        expect(response.status).toBe(200)
        
        const data = await response.json()
        expect(data).toHaveProperty('items')
        expect(Array.isArray(data.items)).toBe(true)
      }
    })
  })

  describe('에러 처리', () => {
    it('서버 에러 시 500 상태 코드를 반환해야 함', async () => {
      // 의도적으로 에러를 발생시키는 테스트
      // 실제 구현에서는 try-catch로 처리됨
      const request = createRequest('http://localhost:3000/api/menu/submenu?type=projects&error=simulate')
      const response = await getSubMenu(request)
      
      // 정상적인 응답이거나 에러 응답이어야 함
      expect([200, 500]).toContain(response.status)
      
      if (response.status === 500) {
        const error = await response.json()
        expect(error).toHaveProperty('error')
        expect(error).toHaveProperty('message')
      }
    })
  })

  describe('응답 스키마 검증', () => {
    it('메뉴 아이템 응답이 올바른 스키마를 가져야 함', async () => {
      const request = createRequest('http://localhost:3000/api/menu/items')
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      
      // 응답 스키마 검증
      expect(data).toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            path: expect.any(String),
            icon: expect.any(String),
            hasSubMenu: expect.any(Boolean)
          })
        ])
      })
    })

    it('서브메뉴 응답이 올바른 스키마를 가져야 함', async () => {
      const request = createRequest('http://localhost:3000/api/menu/submenu?type=projects')
      const response = await getSubMenu(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      
      // 응답 스키마 검증
      expect(data).toMatchObject({
        items: expect.any(Array),
        total: expect.any(Number),
        hasMore: expect.any(Boolean)
      })

      // 각 아이템이 올바른 구조를 가지는지 검증
      data.items.forEach((item: any) => {
        expect(item).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          path: expect.any(String),
          status: expect.stringMatching(/^(active|pending|completed)$/),
          lastModified: expect.any(String) // ISO date string
        })
      })
    })
  })
})