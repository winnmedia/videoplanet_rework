/**
 * @fileoverview TimecodeCommentInput Component Tests
 * @module features/video-feedback/ui/__tests__
 * 
 * 타임코드 자동 삽입 기능이 있는 피드백 입력 컴포넌트의 테스트
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

import { TimecodeCommentInput } from '../TimecodeCommentInput';

// Mock Redux Provider
vi.mock('react-redux', () => ({
  useSelector: vi.fn((fn) => fn({
    videoFeedback: {
      playerState: {
        currentTime: 65.25,
        isPlaying: false,
        duration: 120
      }
    }
  })),
  useDispatch: vi.fn(() => vi.fn())
}));

describe('TimecodeCommentInput', () => {
  let mockVideoRef: React.RefObject<HTMLVideoElement>;
  let mockOnSubmit: ReturnType<typeof vi.fn>;
  let user: any;

  beforeEach(() => {
    // Mock video element
    const mockVideoElement = {
      currentTime: 65.25,
      duration: 120,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as unknown as HTMLVideoElement;

    mockVideoRef = { current: mockVideoElement };
    mockOnSubmit = vi.fn();
    user = userEvent.setup();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('컴포넌트가 올바르게 렌더링되어야 함', () => {
      render(
        <TimecodeCommentInput
          videoRef={mockVideoRef}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByText('작성')).toBeInTheDocument();
      expect(screen.getByText('현재 시점:')).toBeInTheDocument();
      expect(screen.getByText('[01:05.250]')).toBeInTheDocument();
    });

    it('플레이스홀더가 올바르게 표시되어야 함', () => {
      render(
        <TimecodeCommentInput
          videoRef={mockVideoRef}
          onSubmit={mockOnSubmit}
          placeholder="테스트 플레이스홀더"
        />
      );

      expect(screen.getByPlaceholderText('테스트 플레이스홀더')).toBeInTheDocument();
    });

    it('타임코드 기능이 비활성화되면 관련 UI가 숨겨져야 함', () => {
      render(
        <TimecodeCommentInput
          videoRef={mockVideoRef}
          onSubmit={mockOnSubmit}
          enableTimecodeInsertion={false}
        />
      );

      expect(screen.queryByText('현재 시점:')).not.toBeInTheDocument();
      expect(screen.queryByText('삽입 (Shift+T)')).not.toBeInTheDocument();
    });
  });

  describe('타임코드 삽입', () => {
    it('삽입 버튼 클릭 시 타임코드가 삽입되어야 함', async () => {
      render(
        <TimecodeCommentInput
          videoRef={mockVideoRef}
          onSubmit={mockOnSubmit}
        />
      );

      const textarea = screen.getByRole('textbox');
      const insertButton = screen.getByText('삽입 (Shift+T)');

      // 텍스트 입력 후 커서 위치 설정
      await user.type(textarea, '이 부분에서 문제가 있습니다');
      fireEvent.click(insertButton);

      await waitFor(() => {
        expect(textarea).toHaveValue('이 부분에서 문제가 있습니다[01:05.250]');
      });
    });

    it('키보드 단축키(Shift+T)로 타임코드가 삽입되어야 함', async () => {
      render(
        <TimecodeCommentInput
          videoRef={mockVideoRef}
          onSubmit={mockOnSubmit}
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '테스트 메시지');
      
      // Shift+T 키 조합
      fireEvent.keyDown(document, { code: 'KeyT', shiftKey: true });

      await waitFor(() => {
        expect(textarea).toHaveValue('테스트 메시지[01:05.250]');
      });
    });

    it('텍스트 중간에 타임코드가 삽입되어야 함', async () => {
      render(
        <TimecodeCommentInput
          videoRef={mockVideoRef}
          onSubmit={mockOnSubmit}
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '앞부분 뒷부분');
      
      // 커서를 중간으로 이동 (5번째 위치)
      fireEvent.click(textarea);
      (textarea as HTMLTextAreaElement).setSelectionRange(4, 4);
      
      const insertButton = screen.getByText('삽입 (Shift+T)');
      fireEvent.click(insertButton);

      await waitFor(() => {
        expect(textarea).toHaveValue('앞부분[01:05.250] 뒷부분');
      });
    });
  });

  describe('미리보기 기능', () => {
    it('미리보기 탭이 올바르게 작동해야 함', async () => {
      render(
        <TimecodeCommentInput
          videoRef={mockVideoRef}
          onSubmit={mockOnSubmit}
          showPreview={true}
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '테스트 [01:30.500] 타임코드');

      // 미리보기 탭 클릭
      const previewTab = screen.getByText('미리보기');
      await user.click(previewTab);

      // 미리보기 내용 확인
      expect(screen.getByText('테스트')).toBeInTheDocument();
      expect(screen.getByText('[01:30.500]')).toBeInTheDocument();
      expect(screen.getByText('타임코드')).toBeInTheDocument();
    });

    it('미리보기에서 타임코드가 클릭 가능한 버튼으로 렌더링되어야 함', async () => {
      render(
        <TimecodeCommentInput
          videoRef={mockVideoRef}
          onSubmit={mockOnSubmit}
          showPreview={true}
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'See [02:15.750] for details');

      // 미리보기 탭으로 이동
      const previewTab = screen.getByText('미리보기');
      await user.click(previewTab);

      // 타임코드 버튼 확인
      const timecodeButton = screen.getByRole('button', { name: /타임코드.*클릭하여 해당 시점으로 이동/ });
      expect(timecodeButton).toBeInTheDocument();
      expect(timecodeButton).toHaveTextContent('[02:15.750]');
    });
  });

  describe('폼 제출', () => {
    it('Ctrl+Enter로 폼이 제출되어야 함', async () => {
      render(
        <TimecodeCommentInput
          videoRef={mockVideoRef}
          onSubmit={mockOnSubmit}
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '테스트 댓글 [01:05.250]');

      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('테스트 댓글 [01:05.250]');
      });
    });

    it('작성 버튼 클릭으로 폼이 제출되어야 함', async () => {
      render(
        <TimecodeCommentInput
          videoRef={mockVideoRef}
          onSubmit={mockOnSubmit}
        />
      );

      const textarea = screen.getByRole('textbox');
      const submitButton = screen.getByText('작성');

      await user.type(textarea, '테스트 댓글');
      await user.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledWith('테스트 댓글');
    });

    it('빈 내용으로는 제출할 수 없어야 함', async () => {
      render(
        <TimecodeCommentInput
          videoRef={mockVideoRef}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByText('작성');
      expect(submitButton).toBeDisabled();

      await user.click(submitButton);
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('제출 후 입력 필드가 초기화되어야 함', async () => {
      render(
        <TimecodeCommentInput
          videoRef={mockVideoRef}
          onSubmit={mockOnSubmit}
        />
      );

      const textarea = screen.getByRole('textbox');
      const submitButton = screen.getByText('작성');

      await user.type(textarea, '테스트 댓글');
      await user.click(submitButton);

      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });
  });

  describe('접근성', () => {
    it('textarea에 올바른 ARIA 라벨이 있어야 함', () => {
      render(
        <TimecodeCommentInput
          videoRef={mockVideoRef}
          onSubmit={mockOnSubmit}
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-label', '피드백 내용 입력');
    });

    it('타임코드 삽입 버튼에 올바른 ARIA 라벨이 있어야 함', () => {
      render(
        <TimecodeCommentInput
          videoRef={mockVideoRef}
          onSubmit={mockOnSubmit}
        />
      );

      const insertButton = screen.getByLabelText('현재 시점 타임코드 삽입');
      expect(insertButton).toBeInTheDocument();
    });

    it('제출 버튼에 올바른 ARIA 라벨이 있어야 함', () => {
      render(
        <TimecodeCommentInput
          videoRef={mockVideoRef}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByLabelText('댓글 작성');
      expect(submitButton).toBeInTheDocument();
    });

    it('키보드 내비게이션이 올바르게 작동해야 함', async () => {
      render(
        <TimecodeCommentInput
          videoRef={mockVideoRef}
          onSubmit={mockOnSubmit}
        />
      );

      const textarea = screen.getByRole('textbox');
      const insertButton = screen.getByText('삽입 (Shift+T)');
      const submitButton = screen.getByText('작성');

      // Tab을 사용한 순차 내비게이션 테스트
      await user.tab();
      expect(textarea).toHaveFocus();

      await user.tab();
      expect(insertButton).toHaveFocus();

      // 더 많은 탭으로 제출 버튼까지 이동
      await user.tab();
      await user.tab();
      expect(submitButton).toHaveFocus();
    });
  });

  describe('글자 수 제한', () => {
    it('최대 글자 수 표시가 올바르게 작동해야 함', async () => {
      render(
        <TimecodeCommentInput
          videoRef={mockVideoRef}
          onSubmit={mockOnSubmit}
          maxLength={100}
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '테스트');

      expect(screen.getByText('3/100')).toBeInTheDocument();
    });

    it('최대 글자 수를 초과할 수 없어야 함', async () => {
      render(
        <TimecodeCommentInput
          videoRef={mockVideoRef}
          onSubmit={mockOnSubmit}
          maxLength={10}
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '1234567890123456789');

      // 10글자까지만 입력되어야 함
      expect(textarea).toHaveValue('1234567890');
      expect(screen.getByText('10/10')).toBeInTheDocument();
    });
  });

  describe('자동 높이 조절', () => {
    it('내용에 따라 textarea 높이가 조절되어야 함', async () => {
      render(
        <TimecodeCommentInput
          videoRef={mockVideoRef}
          onSubmit={mockOnSubmit}
          rows={{ min: 2, max: 6 }}
        />
      );

      const textarea = screen.getByRole('textbox');
      
      // 여러 줄 입력
      await user.type(textarea, '첫번째 줄\n두번째 줄\n세번째 줄\n네번째 줄');

      // 높이가 자동으로 조절되었는지 확인 (구체적인 픽셀 값은 환경에 따라 다를 수 있음)
      expect(textarea.style.height).toBeTruthy();
    });
  });
});