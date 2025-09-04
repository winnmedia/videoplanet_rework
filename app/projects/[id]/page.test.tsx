/**
 * Project Detail Page Test Suite
 * TDD: useParams를 사용한 동적 라우트 처리 검증
 * 
 * 수정사항:
 * - async function → useParams 사용
 * - 파라미터 검증 및 에러 처리 로직
 */

import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import ProjectDetailPage from './page'


// Mock next/navigation hooks with mutable reference
const mockParams = { id: '1' }
const mockUseParams = vi.fn(() => mockParams)
vi.mock('next/navigation', () => ({
  useParams: mockUseParams,
}))

// Mock SideBar component
vi.mock('@/widgets', () => ({
  SideBar: () => <div data-testid="sidebar">SideBar</div>
}))

describe('ProjectDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Valid Project ID', () => {
    test('should render project details with valid ID', () => {
      render(<ProjectDetailPage />)
      
      // 페이지가 정상적으로 렌더링되는지 확인
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
      expect(screen.getByText('웹사이트 리뉴얼 프로젝트')).toBeInTheDocument()
      expect(screen.getByText('프로젝트 상세 정보')).toBeInTheDocument()
    })

    test('should display correct project information for ID 1', () => {
      render(<ProjectDetailPage />)
      
      const mockProject = { title: '웹사이트 리뉴얼 프로젝트', status: 'active', progress: 65 }
      
      expect(screen.getByText(mockProject.title)).toBeInTheDocument()
      expect(screen.getByText('진행중')).toBeInTheDocument()
      expect(screen.getByText('65%')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument() // Project ID 표시 확인
    })

    test('should display progress bar with correct width', () => {
      render(<ProjectDetailPage />)
      
      // div 요소에서 진행률 바 찾기 (role 대신 클래스나 스타일로 찾기)
      const progressBar = screen.getByText('65%').previousElementSibling?.querySelector('.bg-blue-600')
      expect(progressBar).toHaveStyle('width: 65%')
    })

    test('should display project metadata correctly', () => {
      render(<ProjectDetailPage />)
      
      expect(screen.getByText('프로젝트 ID')).toBeInTheDocument()
      expect(screen.getByText('생성일')).toBeInTheDocument()
      expect(screen.getByText('팀 구성원')).toBeInTheDocument()
      expect(screen.getByText('2025-08-28')).toBeInTheDocument()
      expect(screen.getByText('3명')).toBeInTheDocument()
    })
  })

  describe('Different Project IDs', () => {
    test('should render different project for ID 2', () => {
      // Mock params for project ID 2
      mockUseParams.mockReturnValue({ id: '2' })
      
      render(<ProjectDetailPage />)
      
      expect(screen.getByText('모바일 앱 개발')).toBeInTheDocument()
      expect(screen.getByText('30%')).toBeInTheDocument()
    })

    test('should render completed project for ID 3', () => {
      mockUseParams.mockReturnValue({ id: '3' })
      
      render(<ProjectDetailPage />)
      
      expect(screen.getByText('브랜딩 영상 제작')).toBeInTheDocument()
      expect(screen.getByText('완료')).toBeInTheDocument()
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    test('should apply correct status styling for different statuses', () => {
      // Test active status
      mockUseParams.mockReturnValue({ id: '1' })
      render(<ProjectDetailPage />)
      
      const activeStatus = screen.getByText('진행중')
      expect(activeStatus).toHaveClass('bg-green-100', 'text-green-800')
    })
  })

  describe('Error Scenarios', () => {
    test('should handle missing ID parameter', () => {
      mockUseParams.mockReturnValue({})
      
      render(<ProjectDetailPage />)
      
      expect(screen.getByText('잘못된 접근')).toBeInTheDocument()
      expect(screen.getByText('프로젝트 ID가 필요합니다.')).toBeInTheDocument()
    })

    test('should handle null ID parameter', () => {
      mockUseParams.mockReturnValue({ id: null })
      
      render(<ProjectDetailPage />)
      
      expect(screen.getByText('잘못된 접근')).toBeInTheDocument()
      expect(screen.getByText('프로젝트 ID가 필요합니다.')).toBeInTheDocument()
    })

    test('should handle undefined ID parameter', () => {
      mockUseParams.mockReturnValue({ id: undefined })
      
      render(<ProjectDetailPage />)
      
      expect(screen.getByText('잘못된 접근')).toBeInTheDocument()
      expect(screen.getByText('프로젝트 ID가 필요합니다.')).toBeInTheDocument()
    })

    test('should handle non-existent project ID', () => {
      mockUseParams.mockReturnValue({ id: '999' })
      
      render(<ProjectDetailPage />)
      
      expect(screen.getByText('프로젝트를 찾을 수 없습니다')).toBeInTheDocument()
      expect(screen.getByText('요청하신 프로젝트가 존재하지 않습니다.')).toBeInTheDocument()
    })

    test('should handle invalid ID format', () => {
      mockUseParams.mockReturnValue({ id: 'invalid-id' })
      
      render(<ProjectDetailPage />)
      
      expect(screen.getByText('프로젝트를 찾을 수 없습니다')).toBeInTheDocument()
    })
  })

  describe('Layout and Styling', () => {
    test('should have proper layout structure', () => {
      mockUseParams.mockReturnValue({ id: '1' })
      
      render(<ProjectDetailPage />)
      
      const mainContainer = screen.getByRole('main')
      expect(mainContainer).toHaveClass('flex-1', 'ml-sidebar', 'pt-20', 'transition-all', 'duration-300')
      
      const contentContainer = screen.getByText('웹사이트 리뉴얼 프로젝트').closest('div')
      expect(contentContainer).toHaveClass('container', 'mx-auto', 'px-4', 'py-8', 'max-w-7xl')
    })

    test('should use Tailwind CSS classes correctly', () => {
      mockUseParams.mockReturnValue({ id: '1' })
      
      render(<ProjectDetailPage />)
      
      const pageHeader = screen.getByText('웹사이트 리뉴얼 프로젝트')
      expect(pageHeader).toHaveClass('text-3xl', 'font-bold', 'text-gray-900')
    })

    test('should maintain responsive grid layout', () => {
      mockUseParams.mockReturnValue({ id: '1' })
      
      render(<ProjectDetailPage />)
      
      const gridContainer = screen.getByText('프로젝트 개요').closest('.grid')
      expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-3', 'gap-8')
    })
  })

  describe('Accessibility', () => {
    test('should have proper semantic structure', () => {
      mockUseParams.mockReturnValue({ id: '1' })
      
      render(<ProjectDetailPage />)
      
      const main = screen.getByRole('main')
      expect(main).toBeInTheDocument()
      
      const headings = screen.getAllByRole('heading')
      expect(headings.length).toBeGreaterThan(0)
      
      // H1 heading should exist
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    test('should have meaningful alt text and labels', () => {
      mockUseParams.mockReturnValue({ id: '1' })
      
      render(<ProjectDetailPage />)
      
      // Progress information should be accessible
      const progressText = screen.getByText('진행률:')
      expect(progressText).toBeInTheDocument()
      
      const statusText = screen.getByText('상태:')
      expect(statusText).toBeInTheDocument()
    })
  })

  describe('Mock Data Consistency', () => {
    test('should have consistent mock data structure across all projects', () => {
      const projectIds = ['1', '2', '3', '4']
      
      projectIds.forEach(id => {
        mockUseParams.mockReturnValue({ id })
        render(<ProjectDetailPage />)
        
        // 모든 프로젝트가 필수 필드를 가져야 함
        expect(screen.getByText(/프로젝트/)).toBeInTheDocument()
        expect(screen.getByText(/ID/)).toBeInTheDocument()
        
        // 진행률과 상태가 표시되어야 함
        expect(screen.getByText(/상태:/)).toBeInTheDocument()
        expect(screen.getByText(/진행률:/)).toBeInTheDocument()
      })
    })
  })
})