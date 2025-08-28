/**
 * FeedbackSummaryCard 테스트
 * TDD Red Phase: 피드백 요약 카드 위젯의 실패 테스트 작성
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FeedbackSummaryCard } from './FeedbackSummaryCard'
import type { FeedbackSummaryStats } from '../model/types'

const mockFeedbackStats: FeedbackSummaryStats = {
  totalUnread: 3,
  newComments: 2,
  newReplies: 1,
  emotionChanges: 0,
  recentItems: [
    {
      id: 'feedback-1',
      type: 'comment',
      projectId: 'project-1',
      projectTitle: '브랜드 홍보 영상',
      authorName: '김클라이언트',
      content: '전체적으로 색감이 너무 어두운 것 같아요.',
      timestamp: '2025-08-28T09:30:00Z',
      isRead: false,
      changeType: 'added'
    },
    {
      id: 'feedback-2',
      type: 'reply',
      projectId: 'project-1',
      projectTitle: '브랜드 홍보 영상',
      authorName: '박편집자',
      content: '네, 색감 조정해서 다시 업로드하겠습니다.',
      timestamp: '2025-08-28T10:15:00Z',
      isRead: false,
      parentId: 'feedback-1',
      changeType: 'added'
    }
  ]
}

describe('FeedbackSummaryCard', () => {
  const mockOnViewDetails = jest.fn()
  const mockOnMarkAllRead = jest.fn()
  const mockOnItemClick = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('렌더링', () => {
    it('피드백 요약 제목이 표시되어야 한다', () => {
      render(<FeedbackSummaryCard data={mockFeedbackStats} />)
      
      expect(screen.getByText('새 피드백 요약')).toBeInTheDocument()
    })

    it('읽지 않은 피드백 수가 표시되어야 한다', () => {
      render(<FeedbackSummaryCard data={mockFeedbackStats} />)
      
      expect(screen.getByText('3개의 읽지 않은 피드백')).toBeInTheDocument()
    })

    it('피드백 통계가 올바르게 표시되어야 한다', () => {
      render(<FeedbackSummaryCard data={mockFeedbackStats} />)
      
      expect(screen.getByText('새 댓글 2개')).toBeInTheDocument()
      expect(screen.getByText('새 답글 1개')).toBeInTheDocument()
    })

    it('최근 피드백 아이템 목록이 표시되어야 한다', () => {
      render(<FeedbackSummaryCard data={mockFeedbackStats} />)
      
      expect(screen.getByText('김클라이언트')).toBeInTheDocument()
      expect(screen.getByText('박편집자')).toBeInTheDocument()
      expect(screen.getByText('브랜드 홍보 영상')).toBeInTheDocument()
    })
  })

  describe('상호작용', () => {
    it('전체보기 버튼 클릭 시 onViewDetails가 호출되어야 한다', async () => {
      render(
        <FeedbackSummaryCard 
          data={mockFeedbackStats}
          onViewDetails={mockOnViewDetails}
        />
      )
      
      const viewDetailsButton = screen.getByRole('button', { name: /전체보기/i })
      fireEvent.click(viewDetailsButton)
      
      await waitFor(() => {
        expect(mockOnViewDetails).toHaveBeenCalledTimes(1)
      })
    })

    it('모두 읽음 처리 버튼 클릭 시 onMarkAllRead가 호출되어야 한다', async () => {
      render(
        <FeedbackSummaryCard 
          data={mockFeedbackStats}
          onMarkAllRead={mockOnMarkAllRead}
        />
      )
      
      const markAllReadButton = screen.getByRole('button', { name: /모두 읽음 처리/i })
      fireEvent.click(markAllReadButton)
      
      await waitFor(() => {
        expect(mockOnMarkAllRead).toHaveBeenCalledTimes(1)
      })
    })

    it('개별 피드백 아이템 클릭 시 onItemClick이 호출되어야 한다', async () => {
      render(
        <FeedbackSummaryCard 
          data={mockFeedbackStats}
          onItemClick={mockOnItemClick}
        />
      )
      
      const feedbackItem = screen.getByText('김클라이언트').closest('button')
      expect(feedbackItem).toBeInTheDocument()
      
      if (feedbackItem) {
        fireEvent.click(feedbackItem)
        
        await waitFor(() => {
          expect(mockOnItemClick).toHaveBeenCalledWith('feedback-1')
        })
      }
    })
  })

  describe('읽지 않음 배지', () => {
    it('읽지 않은 피드백이 있을 때 배지가 표시되어야 한다', () => {
      render(<FeedbackSummaryCard data={mockFeedbackStats} />)
      
      const badge = screen.getByText('3')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('bg-error-500') // 우선순위 높음 색상
    })

    it('읽지 않은 피드백이 없을 때 배지가 표시되지 않아야 한다', () => {
      const emptyStats = {
        ...mockFeedbackStats,
        totalUnread: 0,
        recentItems: []
      }
      
      render(<FeedbackSummaryCard data={emptyStats} />)
      
      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })

    it('읽지 않은 개수가 9개를 초과할 때 "9+"로 표시되어야 한다', () => {
      const highCountStats = {
        ...mockFeedbackStats,
        totalUnread: 15
      }
      
      render(<FeedbackSummaryCard data={highCountStats} />)
      
      expect(screen.getByText('9+')).toBeInTheDocument()
    })
  })

  describe('접근성', () => {
    it('적절한 ARIA 레이블이 설정되어야 한다', () => {
      render(<FeedbackSummaryCard data={mockFeedbackStats} />)
      
      const card = screen.getByRole('region', { name: /피드백 요약/i })
      expect(card).toBeInTheDocument()
      
      const badge = screen.getByText('3')
      expect(badge).toHaveAttribute('aria-label', '읽지 않은 피드백 3개')
    })

    it('키보드 네비게이션이 가능해야 한다', () => {
      render(
        <FeedbackSummaryCard 
          data={mockFeedbackStats}
          onItemClick={mockOnItemClick}
        />
      )
      
      const firstItem = screen.getByText('김클라이언트').closest('button')
      expect(firstItem).toBeInTheDocument()
      expect(firstItem).toHaveAttribute('tabIndex', '0')
    })
  })

  describe('빈 상태', () => {
    it('피드백이 없을 때 빈 상태 메시지가 표시되어야 한다', () => {
      const emptyStats = {
        totalUnread: 0,
        newComments: 0,
        newReplies: 0,
        emotionChanges: 0,
        recentItems: []
      }
      
      render(<FeedbackSummaryCard data={emptyStats} />)
      
      expect(screen.getByText('새로운 피드백이 없습니다')).toBeInTheDocument()
      expect(screen.getByText('프로젝트에 새로운 댓글이나 반응이 추가되면 여기에 표시됩니다.')).toBeInTheDocument()
    })
  })

  describe('타임스탬프', () => {
    it('상대적 시간이 올바르게 표시되어야 한다', () => {
      // Mock Date를 설정하여 일관된 테스트 결과 보장
      const mockDate = new Date('2025-08-28T12:00:00Z')
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any)
      
      render(<FeedbackSummaryCard data={mockFeedbackStats} />)
      
      // 2시간 30분 전 (09:30 → 12:00)
      expect(screen.getByText('2시간 전')).toBeInTheDocument()
      
      jest.restoreAllMocks()
    })
  })
})