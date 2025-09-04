'use client'

import React, { useState, Component, ReactNode, ErrorInfo } from 'react'

// 간단한 ErrorBoundary 구현 (의존성 없이)
class SimpleErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 p-8 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow p-6 max-w-md w-full">
            <div className="text-red-600 text-center">
              <h2 className="text-xl font-bold mb-4">오류가 발생했습니다</h2>
              <p className="mb-4">{this.state.error?.message}</p>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                다시 시도
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default function HomePage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProjects = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('http://127.0.0.1:8001/api/v1/projects/')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setProjects(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const triggerError = () => {
    throw new Error('의도적인 테스트 에러입니다')
  }

  return (
    <SimpleErrorBoundary>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-4xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              VLANET - AI 영상 플랫폼
            </h1>
            <p className="text-gray-600">
              AI 시나리오 · 프롬프트 · 영상 생성 · 피드백 파이프라인
            </p>
          </header>

          <nav className="mb-8">
            <a 
              href="#main" 
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded"
              data-testid="skip-link"
            >
              메인 콘텐츠로 건너뛰기
            </a>
            <ul className="flex space-x-4">
              <li>
                <a href="/" className="text-blue-600 hover:text-blue-800" data-cy="nav-home">
                  홈
                </a>
              </li>
              <li>
                <a href="/projects" className="text-blue-600 hover:text-blue-800">
                  프로젝트
                </a>
              </li>
              <li>
                <a href="/feedback" className="text-blue-600 hover:text-blue-800">
                  피드백
                </a>
              </li>
            </ul>
          </nav>

          <main id="main" role="main">
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-2xl font-semibold mb-4">프로젝트 관리</h2>
              
              <div className="flex gap-4 mb-6">
                <button
                  onClick={loadProjects}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  data-testid="load-projects"
                  data-cy="load-projects"
                >
                  {loading ? '로딩 중...' : '프로젝트 불러오기'}
                </button>

                <button
                  onClick={triggerError}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  data-testid="trigger-error"
                  data-cy="trigger-error"
                >
                  에러 테스트
                </button>
              </div>

              {loading && (
                <div 
                  className="flex items-center space-x-2 text-blue-600"
                  data-testid="loading-indicator"
                  aria-live="polite"
                >
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                  <span>프로젝트를 불러오는 중...</span>
                </div>
              )}

              {error && (
                <div 
                  className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4"
                  role="alert"
                  data-testid="error-display"
                  data-cy="error-display"
                >
                  <div className="flex items-center">
                    <span className="text-red-500 mr-2">❌</span>
                    <div>
                      <strong>오류가 발생했습니다</strong>
                      <p>{error}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="mt-2 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    data-testid="retry-button"
                    data-cy="retry-button"
                  >
                    다시 시도
                  </button>
                </div>
              )}

              {projects.length > 0 && (
                <div data-testid="projects-list" data-cy="projects-list">
                  <h3 className="text-lg font-medium mb-3">프로젝트 목록</h3>
                  <ul className="space-y-2">
                    {projects.map((project, index) => (
                      <li key={index} className="border border-gray-200 rounded p-3">
                        <pre className="text-sm">{JSON.stringify(project, null, 2)}</pre>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold mb-4">접근성 테스트 요소</h2>
              
              <form className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    이메일 주소
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    data-testid="email-input"
                    placeholder="예: user@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    비밀번호
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    data-testid="password-input"
                    placeholder="8자 이상"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  data-testid="login-submit"
                >
                  로그인
                </button>
              </form>

              <div className="mt-8">
                <h3 className="text-lg font-medium mb-3">이미지 테스트</h3>
                <img 
                  src="/placeholder-image.jpg" 
                  alt="테스트 이미지 - VideoPlanet 플랫폼 스크린샷"
                  className="w-64 h-48 object-cover border border-gray-200 rounded"
                  loading="lazy"
                />
                
                <img 
                  src="/decorative-pattern.svg" 
                  alt=""
                  role="presentation" 
                  className="w-32 h-16 mt-4"
                />
              </div>
            </div>
          </main>

          <footer className="mt-16 pt-8 border-t border-gray-200 text-center text-gray-500">
            <p>&copy; 2025 VLANET. All rights reserved.</p>
          </footer>
        </div>
      </div>
    </SimpleErrorBoundary>
  )
}