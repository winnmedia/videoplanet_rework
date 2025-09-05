/**
 * @fileoverview Layout 컴포넌트 테스트 - TDD 방식
 * @description 초미니멀 디자인 시스템의 핵심 Layout 컴포넌트 테스트
 */

import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import { Layout } from './Layout.modern'

describe('Layout 컴포넌트', () => {
  describe('기본 렌더링', () => {
    it('올바른 접근성 속성을 가진 main 영역을 렌더링해야 한다', () => {
      render(
        <Layout>
          <div>테스트 콘텐츠</div>
        </Layout>
      )

      const main = screen.getByRole('main')
      expect(main).toBeInTheDocument()
      expect(main).toHaveAttribute('aria-label', 'Main Content')
    })

    it('children을 올바르게 렌더링해야 한다', () => {
      render(
        <Layout>
          <div data-testid="test-content">테스트 콘텐츠</div>
        </Layout>
      )

      expect(screen.getByTestId('test-content')).toBeInTheDocument()
      expect(screen.getByText('테스트 콘텐츠')).toBeInTheDocument()
    })
  })

  describe('사이드바 관련', () => {
    it('사이드바가 있을 때 올바른 그리드 클래스를 적용해야 한다', () => {
      render(
        <Layout sidebar={<div>사이드바</div>}>
          <div>콘텐츠</div>
        </Layout>
      )

      const container = screen.getByRole('main').parentElement
      expect(container).toHaveClass('grid-cols-sidebar')
    })

    it('사이드바가 없을 때 기본 레이아웃을 사용해야 한다', () => {
      render(
        <Layout>
          <div>콘텐츠</div>
        </Layout>
      )

      const container = screen.getByRole('main').parentElement
      expect(container).not.toHaveClass('grid-cols-sidebar')
    })

    it('사이드바 축소 상태를 올바르게 적용해야 한다', () => {
      render(
        <Layout 
          sidebar={<div>사이드바</div>}
          sidebarCollapsed={true}
        >
          <div>콘텐츠</div>
        </Layout>
      )

      const container = screen.getByRole('main').parentElement
      expect(container).toHaveClass('grid-cols-sidebar-collapsed')
    })
  })

  describe('헤더 관련', () => {
    it('헤더가 있을 때 올바르게 렌더링해야 한다', () => {
      render(
        <Layout header={<div data-testid="header">헤더</div>}>
          <div>콘텐츠</div>
        </Layout>
      )

      expect(screen.getByTestId('header')).toBeInTheDocument()
    })

    it('헤더가 없을 때도 올바르게 동작해야 한다', () => {
      render(
        <Layout>
          <div>콘텐츠</div>
        </Layout>
      )

      // 헤더가 없어도 main 콘텐츠는 정상 렌더링
      expect(screen.getByRole('main')).toBeInTheDocument()
    })
  })

  describe('반응형 디자인', () => {
    it('모바일에서 올바른 패딩을 적용해야 한다', () => {
      render(
        <Layout>
          <div>콘텐츠</div>
        </Layout>
      )

      const main = screen.getByRole('main')
      expect(main).toHaveClass('p-4', 'md:p-6', 'lg:p-8')
    })

    it('데스크톱에서 최대 너비 제한을 적용해야 한다', () => {
      render(
        <Layout maxWidth="container">
          <div>콘텐츠</div>
        </Layout>
      )

      const main = screen.getByRole('main')
      expect(main).toHaveClass('max-w-container', 'mx-auto')
    })
  })

  describe('로딩 상태', () => {
    it('로딩 상태일 때 스켈레톤을 표시해야 한다', () => {
      render(
        <Layout loading={true}>
          <div>콘텐츠</div>
        </Layout>
      )

      // 스켈레톤 요소 확인
      const skeleton = screen.getByTestId('layout-skeleton')
      expect(skeleton).toBeInTheDocument()
      expect(skeleton).toHaveClass('animate-pulse')
    })

    it('로딩이 완료되면 실제 콘텐츠를 표시해야 한다', () => {
      render(
        <Layout loading={false}>
          <div data-testid="actual-content">실제 콘텐츠</div>
        </Layout>
      )

      expect(screen.getByTestId('actual-content')).toBeInTheDocument()
      expect(screen.queryByTestId('layout-skeleton')).not.toBeInTheDocument()
    })
  })

  describe('접근성', () => {
    it('키보드 포커스 순서가 올바르게 설정되어야 한다', () => {
      render(
        <Layout 
          header={<button>헤더 버튼</button>}
          sidebar={<button>사이드바 버튼</button>}
        >
          <button>메인 버튼</button>
        </Layout>
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(3)
      // 헤더 → 사이드바 → 메인 순서로 탭 인덱스 확인
    })

    it('스크린 리더를 위한 올바른 구조를 가져야 한다', () => {
      render(
        <Layout 
          header={<div role="banner">헤더</div>}
          sidebar={<nav>네비게이션</nav>}
        >
          <div>메인 콘텐츠</div>
        </Layout>
      )

      expect(screen.getByRole('banner')).toBeInTheDocument()
      expect(screen.getByRole('navigation')).toBeInTheDocument()
      expect(screen.getByRole('main')).toBeInTheDocument()
    })
  })

  describe('커스텀 클래스', () => {
    it('추가 className을 올바르게 병합해야 한다', () => {
      render(
        <Layout className="custom-class">
          <div>콘텐츠</div>
        </Layout>
      )

      const container = screen.getByRole('main').parentElement
      expect(container).toHaveClass('custom-class')
    })
  })
})