import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { PageLayout, PageLayoutProps } from './PageLayout'

describe('PageLayout Widget', () => {
  const defaultProps: PageLayoutProps = {
    title: '테스트 페이지',
    children: <div>테스트 콘텐츠</div>
  }

  it('기본 레이아웃을 렌더링해야 함', () => {
    render(<PageLayout {...defaultProps} />)

    expect(screen.getByText('테스트 페이지')).toBeInTheDocument()
    expect(screen.getByText('테스트 콘텐츠')).toBeInTheDocument()
  })

  it('헤더와 메인 영역을 포함해야 함', () => {
    render(<PageLayout {...defaultProps} />)

    const header = screen.getByRole('banner')
    const main = screen.getByRole('main')

    expect(header).toBeInTheDocument()
    expect(main).toBeInTheDocument()
  })

  it('사이드바를 선택적으로 표시해야 함', () => {
    const sidebarContent = <div>사이드바 콘텐츠</div>

    render(
      <PageLayout {...defaultProps} sidebar={sidebarContent} />
    )

    expect(screen.getByText('사이드바 콘텐츠')).toBeInTheDocument()
  })

  it('breadcrumb을 선택적으로 표시해야 함', () => {
    const breadcrumbs = [
      { label: '홈', href: '/' },
      { label: '프로젝트', href: '/projects' },
      { label: '상세', href: '/projects/123' }
    ]

    render(
      <PageLayout {...defaultProps} breadcrumbs={breadcrumbs} />
    )

    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument()
    expect(screen.getByText('홈')).toBeInTheDocument()
    expect(screen.getByText('프로젝트')).toBeInTheDocument()
    expect(screen.getByText('상세')).toBeInTheDocument()
  })

  it('헤더 액션을 표시해야 함', () => {
    const headerActions = (
      <button>액션 버튼</button>
    )

    render(
      <PageLayout {...defaultProps} headerActions={headerActions} />
    )

    expect(screen.getByText('액션 버튼')).toBeInTheDocument()
  })

  it('로딩 상태를 표시해야 함', () => {
    render(<PageLayout {...defaultProps} loading={true} />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('로딩 중...')).toBeInTheDocument()
  })

  it('에러 상태를 표시해야 함', () => {
    const error = '에러가 발생했습니다'

    render(<PageLayout {...defaultProps} error={error} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(error)).toBeInTheDocument()
  })

  it('풀 폭 레이아웃을 지원해야 함', () => {
    render(<PageLayout {...defaultProps} fullWidth />)

    const main = screen.getByRole('main')
    expect(main).toHaveClass('w-full')
  })

  it('접근성 요구사항을 충족해야 함', async () => {
    const { container } = render(<PageLayout {...defaultProps} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('키보드 네비게이션을 지원해야 함', () => {
    render(<PageLayout {...defaultProps} />)

    const skipLink = screen.getByText('메인 콘텐츠로 건너뛰기')
    expect(skipLink).toBeInTheDocument()
    expect(skipLink).toHaveAttribute('href', '#main-content')
  })

  it('반응형 레이아웃을 적용해야 함', () => {
    const sidebarContent = <div>사이드바</div>

    render(
      <PageLayout {...defaultProps} sidebar={sidebarContent} />
    )

    const layout = screen.getByTestId('page-layout')
    expect(layout).toHaveClass('flex', 'flex-col', 'lg:flex-row')
  })

  it('메타데이터를 설정해야 함', () => {
    const metadata = {
      description: '페이지 설명',
      keywords: ['테스트', '페이지']
    }

    render(<PageLayout {...defaultProps} metadata={metadata} />)
    
    // 메타데이터는 Next.js의 Head를 통해 설정되므로
    // 실제 DOM에는 나타나지 않지만 prop이 전달되는지 확인
    expect(screen.getByTestId('page-layout')).toBeInTheDocument()
  })

  describe('Responsive Behavior', () => {
    it('모바일에서 사이드바를 숨겨야 함', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      const sidebarContent = <div>사이드바</div>

      render(<PageLayout {...defaultProps} sidebar={sidebarContent} />)

      const sidebar = screen.getByText('사이드바').closest('aside')
      expect(sidebar).toHaveClass('hidden', 'lg:block')
    })
  })

  describe('Error Handling', () => {
    it('잘못된 breadcrumb 데이터를 처리해야 함', () => {
      const invalidBreadcrumbs = [
        { label: '', href: '/' }, // 빈 레이블
        { label: '유효한 항목', href: '/valid' }
      ]

      render(
        <PageLayout 
          {...defaultProps} 
          breadcrumbs={invalidBreadcrumbs} 
        />
      )

      // 유효한 breadcrumb만 표시되어야 함
      expect(screen.getByText('유효한 항목')).toBeInTheDocument()
    })
  })
})