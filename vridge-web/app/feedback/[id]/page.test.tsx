/**
 * Video Feedback Page Test Suite
 * TDD: 영상 피드백 기능 구현을 위한 테스트
 * 
 * 주요 기능:
 * - 비디오 플레이어와 타임코드 기반 코멘트
 * - 탭 기반 UI (코멘트/팀원/프로젝트 정보)
 * - 코멘트 상호작용 (대댓글, 감정표현)
 * - 스크린샷 및 공유 기능
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useParams } from 'next/navigation'
import { vi } from 'vitest'

import FeedbackDetailPage from './page'

// Mock next/navigation hooks
const mockParams = { id: '1' }
vi.mock('next/navigation', () => ({
  useParams: () => mockParams,
}))

// Mock SideBar component
vi.mock('@/widgets', () => ({
  SideBar: () => <div data-testid="sidebar">SideBar</div>
}))

describe('Video Feedback Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset params to default
    vi.mocked(useParams).mockReturnValue({ id: '1' })
  })

  describe('Layout Structure', () => {
    test('should render main layout with video player and tabs', () => {
      render(<FeedbackDetailPage />)
      
      // 기본 레이아웃 확인
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
      expect(screen.getByTestId('video-player-section')).toBeInTheDocument()
      expect(screen.getByTestId('feedback-tabs')).toBeInTheDocument()
    })

    test('should have two-column layout: video left, tabs right', () => {
      render(<FeedbackDetailPage />)
      
      const layout = screen.getByTestId('main-layout')
      expect(layout).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-2', 'gap-6')
    })
  })

  describe('Video Player Section', () => {
    test('should render video player with controls', () => {
      render(<FeedbackDetailPage />)
      
      expect(screen.getByTestId('video-player')).toBeInTheDocument()
      expect(screen.getByTestId('video-controls')).toBeInTheDocument()
    })

    test('should render all video control buttons with tooltips', () => {
      render(<FeedbackDetailPage />)
      
      expect(screen.getByTitle('비디오 업로드/교체')).toBeInTheDocument()
      expect(screen.getByTitle('현재 시점 코멘트')).toBeInTheDocument()
      expect(screen.getByTitle('스크린샷 캡처')).toBeInTheDocument()
      expect(screen.getByTitle('공유하기')).toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    test('should render all three tabs', () => {
      render(<FeedbackDetailPage />)
      
      expect(screen.getByRole('tab', { name: '코멘트' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: '팀원' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: '프로젝트 정보' })).toBeInTheDocument()
    })

    test('should show comments tab as active by default', () => {
      render(<FeedbackDetailPage />)
      
      const commentsTab = screen.getByRole('tab', { name: '코멘트' })
      expect(commentsTab).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByTestId('comments-content')).toBeInTheDocument()
    })

    test('should switch to team tab when clicked', async () => {
      render(<FeedbackDetailPage />)
      
      const teamTab = screen.getByRole('tab', { name: '팀원' })
      fireEvent.click(teamTab)
      
      await waitFor(() => {
        expect(teamTab).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByTestId('team-content')).toBeInTheDocument()
      })
    })

    test('should switch to project info tab when clicked', async () => {
      render(<FeedbackDetailPage />)
      
      const projectTab = screen.getByRole('tab', { name: '프로젝트 정보' })
      fireEvent.click(projectTab)
      
      await waitFor(() => {
        expect(projectTab).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByTestId('project-info-content')).toBeInTheDocument()
      })
    })
  })

  describe('Comments Features', () => {
    test('should render comment input with timecode functionality', () => {
      render(<FeedbackDetailPage />)
      
      expect(screen.getByTestId('comment-input')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('코멘트를 입력하세요...')).toBeInTheDocument()
    })

    test('should handle timecode comment creation', async () => {
      render(<FeedbackDetailPage />)
      
      const timecodeButton = screen.getByTitle('현재 시점 코멘트')
      fireEvent.click(timecodeButton)
      
      await waitFor(() => {
        const input = screen.getByTestId('comment-input')
        expect(input).toHaveValue('[00:00.000] ')
      })
    })

    test('should render comment reactions (좋아요/싫어요/질문)', () => {
      render(<FeedbackDetailPage />)
      
      expect(screen.getByTitle('좋아요')).toBeInTheDocument()
      expect(screen.getByTitle('싫어요')).toBeInTheDocument()
      expect(screen.getByTitle('질문 있어요')).toBeInTheDocument()
    })

    test('should render comment sorting options', () => {
      render(<FeedbackDetailPage />)
      
      expect(screen.getByText('타임코드순')).toBeInTheDocument()
      expect(screen.getByText('최신순')).toBeInTheDocument()
      expect(screen.getByText('해결됨')).toBeInTheDocument()
    })

    test('should support reply functionality', () => {
      render(<FeedbackDetailPage />)
      
      expect(screen.getByTestId('reply-section')).toBeInTheDocument()
    })
  })

  describe('Team Management Tab', () => {
    test('should render team invitation form', async () => {
      render(<FeedbackDetailPage />)
      
      const teamTab = screen.getByRole('tab', { name: '팀원' })
      fireEvent.click(teamTab)
      
      await waitFor(() => {
        expect(screen.getByText('이메일로 팀원 초대')).toBeInTheDocument()
        expect(screen.getByTestId('email-input')).toBeInTheDocument()
        expect(screen.getByText('초대 전송')).toBeInTheDocument()
      })
    })

    test('should show team member status indicators', async () => {
      render(<FeedbackDetailPage />)
      
      const teamTab = screen.getByRole('tab', { name: '팀원' })
      fireEvent.click(teamTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('team-members-list')).toBeInTheDocument()
      })
    })
  })

  describe('Project Info Tab', () => {
    test('should render project information', async () => {
      render(<FeedbackDetailPage />)
      
      const projectTab = screen.getByRole('tab', { name: '프로젝트 정보' })
      fireEvent.click(projectTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('project-title')).toBeInTheDocument()
        expect(screen.getByTestId('project-version')).toBeInTheDocument()
        expect(screen.getByTestId('video-duration')).toBeInTheDocument()
        expect(screen.getByTestId('video-resolution')).toBeInTheDocument()
      })
    })

    test('should render mini gantt chart', async () => {
      render(<FeedbackDetailPage />)
      
      const projectTab = screen.getByRole('tab', { name: '프로젝트 정보' })
      fireEvent.click(projectTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('mini-gantt')).toBeInTheDocument()
      })
    })

    test('should show sharing settings', async () => {
      render(<FeedbackDetailPage />)
      
      const projectTab = screen.getByRole('tab', { name: '프로젝트 정보' })
      fireEvent.click(projectTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('sharing-settings')).toBeInTheDocument()
      })
    })
  })

  describe('Screenshot Functionality', () => {
    test('should open screenshot modal when button clicked', async () => {
      render(<FeedbackDetailPage />)
      
      const screenshotButton = screen.getByTitle('스크린샷 캡쳐')
      fireEvent.click(screenshotButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('screenshot-modal')).toBeInTheDocument()
      })
    })

    test('should generate proper screenshot filename format', async () => {
      render(<FeedbackDetailPage />)
      
      const screenshotButton = screen.getByTitle('스크린샷 캡쳐')
      fireEvent.click(screenshotButton)
      
      await waitFor(() => {
        // project-{slug}_TC{mmssfff}_{YYYY-MM-DD}T{HHmmss}.jpg 형식 검증
        expect(screen.getByTestId('screenshot-filename')).toBeInTheDocument()
      })
    })

    test('should show screenshot preview in comments', () => {
      render(<FeedbackDetailPage />)
      
      expect(screen.getByTestId('screenshot-preview')).toBeInTheDocument()
    })
  })

  describe('Share Functionality', () => {
    test('should open sharing modal when button clicked', async () => {
      render(<FeedbackDetailPage />)
      
      const shareButton = screen.getByTitle('공유하기')
      fireEvent.click(shareButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('share-modal')).toBeInTheDocument()
      })
    })

    test('should show sharing permissions settings', async () => {
      render(<FeedbackDetailPage />)
      
      const shareButton = screen.getByTitle('공유하기')
      fireEvent.click(shareButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('share-permissions')).toBeInTheDocument()
        expect(screen.getByTestId('share-expiry')).toBeInTheDocument()
      })
    })

    test('should have manual refresh option', () => {
      render(<FeedbackDetailPage />)
      
      expect(screen.getByTitle('수동 새로고침')).toBeInTheDocument()
    })
  })

  describe('Error Scenarios', () => {
    test('should handle missing ID parameter', () => {
      vi.mocked(useParams).mockReturnValue({})
      
      render(<FeedbackDetailPage />)
      
      expect(screen.getByText('잘못된 접근')).toBeInTheDocument()
      expect(screen.getByText('피드백 ID가 필요합니다.')).toBeInTheDocument()
    })

    test('should handle non-existent feedback ID', () => {
      vi.mocked(useParams).mockReturnValue({ id: '999' })
      
      render(<FeedbackDetailPage />)
      
      expect(screen.getByText('피드백을 찾을 수 없습니다')).toBeInTheDocument()
      expect(screen.getByText('요청하신 피드백이 존재하지 않습니다.')).toBeInTheDocument()
    })
  })
})