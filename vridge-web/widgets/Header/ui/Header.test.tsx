import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { Header } from './Header'

// Next.js navigation 모킹
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('Header 위젯', () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  describe('렌더링', () => {
    it('기본 헤더가 렌더링되어야 함', () => {
      render(<Header />)
      const header = screen.getByRole('banner')
      expect(header).toBeInTheDocument()
    })

    it('빈 배열이 전달되어도 오류 없이 렌더링되어야 함', () => {
      render(<Header leftItems={[]} rightItems={[]} />)
      const header = screen.getByRole('banner')
      expect(header).toBeInTheDocument()
    })
  })

  describe('leftItems 렌더링', () => {
    it('이미지 타입 아이템이 렌더링되어야 함', () => {
      const leftItems = [
        {
          type: 'img' as const,
          src: '/logo.png',
          className: 'logo',
        },
      ]

      render(<Header leftItems={leftItems} />)
      const image = screen.getByAltText('header-img-0')
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src')
    })

    it('문자열 타입 아이템이 렌더링되어야 함', () => {
      const leftItems = [
        {
          type: 'string' as const,
          text: 'VRidge',
          className: 'title',
        },
      ]

      render(<Header leftItems={leftItems} />)
      expect(screen.getByText('VRidge')).toBeInTheDocument()
    })
  })

  describe('rightItems 렌더링', () => {
    it('프로필 정보가 올바르게 렌더링되어야 함', () => {
      const rightItems = [
        {
          type: 'string' as const,
          text: 'J',
          className: 'nick',
        },
        {
          type: 'string' as const,
          text: 'john@example.com',
          className: 'mail',
        },
      ]

      render(<Header rightItems={rightItems} />)
      expect(screen.getByText('J')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
    })

    it('프로필 아이콘이 동그란 배경과 함께 렌더링되어야 함', () => {
      const rightItems = [
        {
          type: 'string' as const,
          text: 'K',
          className: 'nick',
        },
      ]

      render(<Header rightItems={rightItems} />)
      const profileIcon = screen.getByText('K')
      expect(profileIcon).toBeInTheDocument()
      expect(profileIcon).toHaveClass('w-10')
      expect(profileIcon).toHaveClass('h-10')
      expect(profileIcon).toHaveClass('rounded-full')
      expect(profileIcon).toHaveClass('bg-slate-600')
    })
  })

  describe('상호작용', () => {
    it('이미지 클릭 시 기본 경로로 이동해야 함', () => {
      const leftItems = [
        {
          type: 'img' as const,
          src: '/logo.png',
          className: 'logo',
        },
      ]

      render(<Header leftItems={leftItems} />)
      const image = screen.getByAltText('header-img-0')
      
      fireEvent.click(image)
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    it('커스텀 onClick 핸들러가 실행되어야 함', () => {
      const customClick = vi.fn()
      const leftItems = [
        {
          type: 'img' as const,
          src: '/logo.png',
          className: 'logo',
          onClick: customClick,
        },
      ]

      render(<Header leftItems={leftItems} />)
      const image = screen.getByAltText('header-img-0')
      
      fireEvent.click(image)
      expect(customClick).toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('스타일링', () => {
    it('헤더가 올바른 스타일 클래스를 가져야 함', () => {
      render(<Header />)
      const header = screen.getByRole('banner')
      
      expect(header).toHaveClass('flex')
      expect(header).toHaveClass('items-center')
      expect(header).toHaveClass('justify-between')
      expect(header).toHaveClass('h-20')
      expect(header).toHaveClass('px-8')
    })

    it('커스텀 className이 적용되어야 함', () => {
      const leftItems = [
        {
          type: 'string' as const,
          text: 'Custom Text',
          className: 'custom-class',
        },
      ]

      render(<Header leftItems={leftItems} />)
      const textElement = screen.getByText('Custom Text')
      expect(textElement).toBeInTheDocument()
      // className이 포함된 div를 찾음
      const customDiv = textElement.closest('.custom-class')
      expect(customDiv).toBeInTheDocument()
    })
  })
})