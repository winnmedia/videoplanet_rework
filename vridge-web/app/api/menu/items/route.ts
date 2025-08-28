/**
 * Menu Items API Route
 * GET /api/menu/items - 메인 메뉴 아이템 목록 조회
 */

import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler'
import { MenuItemsResponseSchema, validateRequest, parseUrlSearchParams } from '@/shared/api/schemas'
import { z } from 'zod'

// 메인 메뉴 데이터 (실제로는 데이터베이스나 CMS에서 가져옴)
const MAIN_MENU_ITEMS = [
  {
    id: 'dashboard',
    name: '대시보드',
    path: '/dashboard',
    icon: 'home',
    hasSubMenu: false,
    order: 1,
    isActive: true
  },
  {
    id: 'projects',
    name: '프로젝트',
    path: '/projects',
    icon: 'projects',
    hasSubMenu: true,
    order: 2,
    isActive: true
  },
  {
    id: 'feedback',
    name: '피드백',
    path: '/feedback',
    icon: 'feedback',
    hasSubMenu: true,
    order: 3,
    isActive: true
  },
  {
    id: 'planning',
    name: '기획',
    path: '/planning',
    icon: 'planning',
    hasSubMenu: true,
    order: 4,
    isActive: true
  },
  {
    id: 'calendar',
    name: '캘린더',
    path: '/calendar',
    icon: 'calendar',
    hasSubMenu: false,
    order: 5,
    isActive: true
  }
]

// 요청 스키마 정의
const MenuItemsRequestSchema = z.object({
  search: z.string().optional(),
  includeInactive: z.coerce.boolean().default(false).optional()
})

export const GET = withErrorHandler(async (request: NextRequest) => {
  try {
    // URL 파라미터 파싱 및 검증
    const params = parseUrlSearchParams(request.url)
    const validatedParams = validateRequest(MenuItemsRequestSchema, params)
    
    // 메뉴 아이템 필터링
    let filteredItems = MAIN_MENU_ITEMS
    
    // 비활성 메뉴 필터링 (기본적으로 활성 메뉴만)
    if (!validatedParams.includeInactive) {
      filteredItems = filteredItems.filter(item => item.isActive)
    }
    
    // 검색어 필터링
    if (validatedParams.search) {
      const searchTerm = validatedParams.search.toLowerCase()
      filteredItems = filteredItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        item.path.toLowerCase().includes(searchTerm)
      )
    }
    
    // 순서대로 정렬
    filteredItems.sort((a, b) => a.order - b.order)
    
    // 응답 데이터 구성
    const responseData = {
      success: true,
      timestamp: new Date().toISOString(),
      message: '메뉴 아이템 조회 성공',
      data: {
        items: filteredItems
      }
    }
    
    // 스키마 검증
    const validatedResponse = validateRequest(MenuItemsResponseSchema, responseData)
    
    return NextResponse.json(validatedResponse, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=600', // 5분 클라이언트 캐시, 10분 CDN 캐시
        'Vary': 'Accept-Encoding'
      }
    })
    
  } catch (error) {
    // 검증 오류나 기타 오류를 상위 에러 핸들러로 전달
    throw error
  }
})

// OPTIONS 요청 처리 (CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}