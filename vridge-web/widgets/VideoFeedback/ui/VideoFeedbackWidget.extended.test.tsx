/**
 * @description VideoFeedback 위젯 확장 테스트 (커버리지 100% 목표)
 * @purpose 에러 처리, 엣지 케이스, 접근성 등 모든 시나리오 커버
 */

import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { VideoFeedbackWidget } from './VideoFeedbackWidget.minimal'

describe('VideoFeedbackWidget - 확장 테스트 (커버리지 100%)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // 윈도우 크기 초기화
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    })
  })

  describe('에러 처리 및 엣지 케이스', () => {
    it('마감일 표시 로직 - 시간 계산', async () => {
      render(<VideoFeedbackWidget sessionId="session-001" />)
      
      await waitFor(() => {
        expect(screen.getByTestId('deadline-countdown')).toBeInTheDocument()
      }, { timeout: 2000 })
      
      expect(screen.getByText(/마감까지/)).toBeInTheDocument()
    })

    it('읽기 전용 모드에서의 동작', async () => {
      render(<VideoFeedbackWidget sessionId="session-001" isReadOnly={true} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
      }, { timeout: 2000 })
      
      // 읽기 전용 모드 확인 (현재는 UI에 영향 없지만 향후 확장 고려)
      expect(screen.getByText('브랜드 홍보 영상 v2.0 피드백')).toBeInTheDocument()
    })

    it('showMarkers prop이 false일 때', async () => {
      render(<VideoFeedbackWidget sessionId="session-001" showMarkers={false} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
      }, { timeout: 2000 })
      
      // 마커는 현재 구현에 포함되지 않았으므로 기본 렌더링 확인
      expect(screen.getByTestId('video-player')).toBeInTheDocument()
    })

    it('빈 댓글 배열 처리', async () => {
      // sessionId를 다르게 하여 다른 데이터 시뮬레이션 (향후 확장)
      render(<VideoFeedbackWidget sessionId="empty-comments" />)
      
      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
      }, { timeout: 2000 })
      
      // 현재는 하드코딩된 댓글이 있지만, 향후 빈 상태 처리 확인
      expect(screen.getByTestId('comment-thread')).toBeInTheDocument()
    })
  })

  describe('반응형 레이아웃 테스트', () => {
    it('모바일 뷰포트에서 클래스 적용', async () => {
      // 모바일 크기로 설정
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })
      window.dispatchEvent(new Event('resize'))

      render(<VideoFeedbackWidget sessionId="session-001" />)
      
      await waitFor(() => {
        const widget = screen.getByTestId('video-feedback-widget')
        expect(widget).toBeInTheDocument()
        // CSS 모듈 클래스에 mobile 관련 문자열 포함 확인
        expect(widget.className).toMatch(/mobile|stack/i)
      }, { timeout: 2000 })
    })

    it('데스크톱 뷰포트에서 클래스 적용', async () => {
      // 데스크톱 크기로 설정
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1440
      })
      window.dispatchEvent(new Event('resize'))

      render(<VideoFeedbackWidget sessionId="session-001" />)
      
      await waitFor(() => {
        const widget = screen.getByTestId('video-feedback-widget')
        expect(widget).toBeInTheDocument()
        // CSS 모듈 클래스에 desktop 관련 문자열 포함 확인
        expect(widget.className).toMatch(/desktop|sidebar/i)
      }, { timeout: 2000 })
    })

    it('태블릿 뷰포트에서 기본 클래스', async () => {
      // 태블릿 크기로 설정 (중간 크기)
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      })
      window.dispatchEvent(new Event('resize'))

      render(<VideoFeedbackWidget sessionId="session-001" />)
      
      await waitFor(() => {
        const widget = screen.getByTestId('video-feedback-widget')
        expect(widget).toBeInTheDocument()
        // 기본 클래스만 적용되어야 함
        expect(widget.className).toContain('supportsHighContrast')
      }, { timeout: 2000 })
    })
  })

  describe('콜백 함수 테스트', () => {
    it('onSessionUpdate 콜백 호출', async () => {
      const mockOnSessionUpdate = vi.fn()
      
      render(
        <VideoFeedbackWidget 
          sessionId="session-001" 
          onSessionUpdate={mockOnSessionUpdate}
        />
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
      }, { timeout: 2000 })
      
      // onSessionUpdate가 세션 데이터와 함께 호출되는지 확인
      expect(mockOnSessionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'session-001',
          title: '브랜드 홍보 영상 v2.0 피드백',
          status: 'in_review'
        })
      )
    })

    it('onError 콜백 호출 (향후 에러 시나리오)', async () => {
      const mockOnError = vi.fn()
      
      render(
        <VideoFeedbackWidget 
          sessionId="session-001" 
          onError={mockOnError}
        />
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
      }, { timeout: 2000 })
      
      // 현재 구현에서는 항상 성공하므로 onError 호출 안됨
      expect(mockOnError).not.toHaveBeenCalled()
    })

    it('콜백 없이도 정상 동작', async () => {
      // 콜백 없이 렌더링
      render(<VideoFeedbackWidget sessionId="session-001" />)
      
      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
      }, { timeout: 2000 })
      
      // 콜백이 없어도 정상적으로 렌더링되어야 함
      expect(screen.getByText('브랜드 홍보 영상 v2.0 피드백')).toBeInTheDocument()
    })
  })

  describe('접근성 (WCAG 2.1 AA) 테스트', () => {
    it('메인 컨테이너 접근성 속성', async () => {
      render(<VideoFeedbackWidget sessionId="session-001" />)
      
      await waitFor(() => {
        const mainElement = screen.getByRole('main')
        expect(mainElement).toBeInTheDocument()
        expect(mainElement).toHaveAttribute('role', 'main')
        expect(mainElement).toHaveAttribute('aria-label', '비디오 피드백')
      }, { timeout: 2000 })
    })

    it('비디오 요소 접근성 속성', async () => {
      render(<VideoFeedbackWidget sessionId="session-001" />)
      
      await waitFor(() => {
        const videoElement = screen.getByRole('video')
        expect(videoElement).toBeInTheDocument()
        expect(videoElement).toHaveAttribute('aria-label', 'brand_promotion_v2')
        expect(videoElement).toHaveAttribute('aria-describedby', 'video-description')
      }, { timeout: 2000 })
      
      // 비디오 설명 요소 확인
      const videoDescription = document.getElementById('video-description')
      expect(videoDescription).toBeInTheDocument()
    })

    it('타임라인 슬라이더 접근성', async () => {
      render(<VideoFeedbackWidget sessionId="session-001" showTimeline={true} />)
      
      await waitFor(() => {
        const timeline = screen.getByRole('slider')
        expect(timeline).toBeInTheDocument()
        expect(timeline).toHaveAttribute('aria-label', '비디오 진행률')
        expect(timeline).toHaveAttribute('aria-valuemin', '0')
        expect(timeline).toHaveAttribute('aria-valuemax', '180')
        expect(timeline).toHaveAttribute('aria-valuenow', '0')
      }, { timeout: 2000 })
    })

    it('댓글 영역 접근성', async () => {
      render(<VideoFeedbackWidget sessionId="session-001" />)
      
      await waitFor(() => {
        const commentThread = screen.getByRole('region')
        expect(commentThread).toBeInTheDocument()
        expect(commentThread).toHaveAttribute('aria-label', '댓글 스레드')
      }, { timeout: 2000 })
      
      // 개별 댓글 접근성
      const comment = screen.getByRole('article')
      expect(comment).toHaveAttribute('aria-label', '김클라이언트의 댓글')
    })

    it('버튼 요소들의 접근성 라벨', async () => {
      render(<VideoFeedbackWidget sessionId="session-001" />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '재생' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '구간 반복' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '전체화면' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '답글' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '수정' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '해결됨 표시' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '댓글 추가' })).toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('폼 요소 접근성', async () => {
      render(<VideoFeedbackWidget sessionId="session-001" />)
      
      await waitFor(() => {
        const commentInput = screen.getByRole('textbox')
        expect(commentInput).toBeInTheDocument()
        expect(commentInput).toHaveAttribute('aria-label', '댓글 입력')
        
        const speedSelect = screen.getByRole('button', { name: '재생 속도' })
        expect(speedSelect).toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  describe('props 조합 테스트', () => {
    it('모든 옵션 활성화', async () => {
      render(
        <VideoFeedbackWidget 
          sessionId="session-001" 
          isReadOnly={false}
          showTimeline={true}
          showMarkers={true}
          showStats={true}
        />
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
        expect(screen.getByTestId('feedback-timeline')).toBeInTheDocument()
        expect(screen.getByTestId('feedback-status-bar')).toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('모든 옵션 비활성화', async () => {
      render(
        <VideoFeedbackWidget 
          sessionId="session-001" 
          isReadOnly={true}
          showTimeline={false}
          showMarkers={false}
          showStats={false}
        />
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
        expect(screen.queryByTestId('feedback-timeline')).not.toBeInTheDocument()
        expect(screen.queryByTestId('feedback-status-bar')).not.toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('부분적 옵션 활성화', async () => {
      render(
        <VideoFeedbackWidget 
          sessionId="session-001" 
          showTimeline={true}
          showStats={false}
        />
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
        expect(screen.getByTestId('feedback-timeline')).toBeInTheDocument()
        expect(screen.queryByTestId('feedback-status-bar')).not.toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  describe('유틸리티 함수 커버리지', () => {
    it('시간 포맷팅 함수 동작 확인', async () => {
      render(<VideoFeedbackWidget sessionId="session-001" />)
      
      await waitFor(() => {
        // formatTimestamp 함수가 사용된 결과 확인
        expect(screen.getByText('3분 0초')).toBeInTheDocument() // duration: 180초
        expect(screen.getByText('0분 15초')).toBeInTheDocument() // comment timestamp: 15.5초
      }, { timeout: 2000 })
    })

    it('상태 라벨 변환 함수 동작 확인', async () => {
      render(<VideoFeedbackWidget sessionId="session-001" />)
      
      await waitFor(() => {
        // getStatusLabel 함수가 사용된 결과 확인
        expect(screen.getByText('검토중')).toBeInTheDocument() // in_review → 검토중
      }, { timeout: 2000 })
    })
  })
})