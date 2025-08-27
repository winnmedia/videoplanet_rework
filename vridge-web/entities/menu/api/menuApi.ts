import type { MenuApiResponse, SubMenuItem } from '../model/types'

class MenuApi {
  private readonly baseUrl = '/api/menu'

  async getSubMenuItems(menuType: string): Promise<SubMenuItem[]> {
    try {
      // For now, return mock data that matches DEVPLAN.md requirements
      // TODO: Replace with actual API call when backend is ready
      const mockData = await this.getMockSubMenuItems(menuType)
      return mockData.items
    } catch (error) {
      console.error('Failed to fetch submenu items:', error)
      throw new Error(`Failed to load ${menuType} items`)
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
        lastModified: new Date('2025-08-25')
      },
      {
        id: '2', 
        name: '모바일 앱 개발',
        path: '/projects/2',
        status: 'pending',
        badge: 1,
        lastModified: new Date('2025-08-20')
      },
      {
        id: '3',
        name: '브랜딩 영상 제작',
        path: '/projects/3',
        status: 'completed',
        lastModified: new Date('2025-08-15')
      },
      {
        id: '4',
        name: 'UI/UX 디자인 시스템',
        path: '/projects/4',
        status: 'active',
        badge: 5,
        lastModified: new Date('2025-08-26')
      }
    ]

    const mockFeedbackItems: SubMenuItem[] = mockProjectItems.map(project => ({
      ...project,
      path: `/feedback/${project.id}`,
      name: `${project.name} 피드백`
    }))

    const mockPlanningItems: SubMenuItem[] = [
      {
        id: '1',
        name: '컨셉 기획',
        path: '/planning/concept',
        status: 'active',
        badge: 2,
        lastModified: new Date('2025-08-27')
      },
      {
        id: '2',
        name: '대본 작성',
        path: '/planning/script',
        status: 'pending',
        lastModified: new Date('2025-08-25')
      },
      {
        id: '3',
        name: '스토리보드',
        path: '/planning/storyboard',
        status: 'completed',
        lastModified: new Date('2025-08-20')
      },
      {
        id: '4',
        name: '촬영 리스트',
        path: '/planning/shot-list',
        status: 'pending',
        lastModified: new Date('2025-08-26')
      }
    ]

    const items = menuType === 'projects' ? mockProjectItems 
                 : menuType === 'planning' ? mockPlanningItems
                 : mockFeedbackItems

    return {
      items,
      total: items.length,
      hasMore: false
    }
  }

  // Future API methods
  async createProject(data: Partial<SubMenuItem>): Promise<SubMenuItem> {
    // TODO: Implement actual API call
    throw new Error('Not implemented yet')
  }

  async updateProject(id: string, data: Partial<SubMenuItem>): Promise<SubMenuItem> {
    // TODO: Implement actual API call  
    throw new Error('Not implemented yet')
  }

  async deleteProject(id: string): Promise<void> {
    // TODO: Implement actual API call
    throw new Error('Not implemented yet')
  }
}

export const menuApi = new MenuApi()