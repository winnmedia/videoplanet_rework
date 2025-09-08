import { httpClient } from '@/shared/api'
import { validateData, SubMenuResponseSchema, MenuItemsResponseSchema } from '@/shared/api/schemas'

import type { MenuApiResponse, SubMenuItem } from '../model/types'

class MenuApi {
  private readonly baseUrl = '/api/menu'

  async getSubMenuItems(menuType: string): Promise<SubMenuItem[]> {
    try {
      // 단순 HTTP 호출
      const response = await httpClient.get(`${this.baseUrl}/submenu?type=${menuType}`)

      // 스키마 검증
      const validationResult = validateData(SubMenuResponseSchema, response.data)
      if (!validationResult.success) {
        throw new Error(`Schema validation failed: ${validationResult.error}`)
      }
      const validatedResponse = validationResult.data

      return validatedResponse.data.items
    } catch (error) {
      console.error('Failed to fetch submenu items:', error)

      // 에러 발생 시 폴백으로 모킹 데이터 사용
      console.warn(`API 호출 실패로 모킹 데이터 사용: ${menuType}`)
      const mockData = await this.getMockSubMenuItems(menuType)
      return mockData.items
    }
  }

  async getProjectItems(): Promise<SubMenuItem[]> {
    return this.getSubMenuItems('projects')
  }

  async getFeedbackItems(): Promise<SubMenuItem[]> {
    return this.getSubMenuItems('feedback')
  }

  private async getMockSubMenuItems(menuType: string): Promise<MenuApiResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100))

    const mockProjectItems: SubMenuItem[] = [
      {
        id: '1',
        name: '웹사이트 리뉴얼 프로젝트',
        path: '/projects/1',
        status: 'active',
        badge: 3,
        lastModified: '2025-08-25',
      },
      {
        id: '2',
        name: '모바일 앱 개발',
        path: '/projects/2',
        status: 'pending',
        badge: 1,
        lastModified: '2025-08-20',
      },
      {
        id: '3',
        name: '브랜딩 영상 제작',
        path: '/projects/1',
        status: 'completed',
        lastModified: '2025-08-15',
      },
      {
        id: '4',
        name: 'UI/UX 디자인 시스템',
        path: '/projects/4',
        status: 'active',
        badge: 5,
        lastModified: '2025-08-26',
      },
    ]

    const mockFeedbackItems: SubMenuItem[] = mockProjectItems.map(project => ({
      ...project,
      path: `/feedback/${project.id}`,
      name: `${project.name} 피드백`,
    }))

    const mockPlanningItems: SubMenuItem[] = [
      {
        id: '1',
        name: '컨셉 기획',
        path: '/planning/concept',
        status: 'active',
        badge: 2,
        lastModified: '2025-08-27',
      },
      {
        id: '2',
        name: '대본 작성',
        path: '/planning/script',
        status: 'pending',
        lastModified: '2025-08-24',
      },
      {
        id: '3',
        name: '스토리보드',
        path: '/planning/storyboard',
        status: 'completed',
        lastModified: '2025-08-22',
      },
      {
        id: '4',
        name: '촬영 리스트',
        path: '/planning/shot-list',
        status: 'pending',
        lastModified: '2025-08-23',
      },
    ]

    const items =
      menuType === 'projects' ? mockProjectItems : menuType === 'planning' ? mockPlanningItems : mockFeedbackItems

    return {
      items,
      total: items.length,
      hasMore: false,
    }
  }

  // 메인 메뉴 아이템 조회
  async getMenuItems(includeInactive = false): Promise<Record<string, unknown>[]> {
    try {
      const response = await httpClient.get(`${this.baseUrl}/items?includeInactive=${includeInactive}`)

      // 스키마 검증
      const validationResult = validateData(MenuItemsResponseSchema, response.data)
      if (!validationResult.success) {
        throw new Error(`Schema validation failed: ${validationResult.error}`)
      }
      const validatedResponse = validationResult.data

      return validatedResponse.data.items
    } catch (error) {
      console.error('Failed to fetch menu items:', error)

      // 기본 메뉴 구조 반환
      return [
        { id: 'dashboard', name: '대시보드', path: '/dashboard', icon: 'home', hasSubMenu: false },
        { id: 'projects', name: '프로젝트', path: '/projects', icon: 'projects', hasSubMenu: true },
        { id: 'feedback', name: '피드백', path: '/feedback', icon: 'feedback', hasSubMenu: true },
        { id: 'planning', name: '기획', path: '/planning', icon: 'planning', hasSubMenu: true },
        { id: 'calendar', name: '캘린더', path: '/calendar', icon: 'calendar', hasSubMenu: false },
      ]
    }
  }

  // 단순 CRUD 메소드들 - 캐시 제거, 직접적인 HTTP 호출
  async createProject(data: Partial<SubMenuItem>): Promise<SubMenuItem> {
    const response = await httpClient.post('/api/projects', data)
    const responseData = response.data as { items?: SubMenuItem[] }

    if (!responseData.items || responseData.items.length === 0) {
      throw new Error('Invalid API response: No items returned')
    }

    return responseData.items[0]
  }

  async updateProject(id: string, data: Partial<SubMenuItem>): Promise<SubMenuItem> {
    const response = await httpClient.put(`/api/projects/${id}`, data)
    const responseData = response.data as { items?: SubMenuItem[] }

    if (!responseData.items || responseData.items.length === 0) {
      throw new Error('Invalid API response: No items returned')
    }

    return responseData.items[0]
  }

  async deleteProject(id: string): Promise<void> {
    await httpClient.delete(`/api/projects/${id}`)
  }
}

export const menuApi = new MenuApi()
