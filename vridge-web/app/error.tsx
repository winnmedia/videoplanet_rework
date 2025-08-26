'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const [isRetrying, setIsRetrying] = useState(false)
  const [errorTime, setErrorTime] = useState<Date | null>(null)

  useEffect(() => {
    // 에러 로깅 (프로덕션에서는 에러 리포팅 서비스로 전송)
    console.error('Application error:', error)
    setErrorTime(new Date())
    
    // 프로덕션 환경에서 에러 리포팅 서비스로 전송
    if (process.env.NODE_ENV === 'production') {
      // TODO: Sentry 또는 다른 에러 리포팅 서비스로 전송
    }
  }, [error])

  const handleRetry = async () => {
    setIsRetrying(true)
    // 약간의 지연을 주어 사용자에게 재시도 중임을 알림
    await new Promise(resolve => setTimeout(resolve, 500))
    reset()
    setIsRetrying(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-gray-50">
      <div className="text-center px-4 max-w-2xl">
        {/* 에러 코드 및 아이콘 */}
        <div className="relative mb-8">
          <div className="text-[150px] font-bold text-red-100 select-none">500</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-24 h-24 text-red-500 opacity-80"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>
        
        {/* 에러 메시지 */}
        <h1 className="text-3xl font-bold text-dark mb-4">
          일시적인 오류가 발생했습니다
        </h1>
        
        <p className="text-gray-600 mb-8">
          요청을 처리하는 중에 예기치 않은 오류가 발생했습니다.<br />
          불편을 드려 죄송합니다. 잠시 후 다시 시도해주세요.
        </p>

        {/* 개발 환경에서만 에러 상세 표시 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-8 text-left">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-red-800 text-sm mb-1">개발 환경 디버그 정보</p>
                <p className="font-mono text-xs text-red-700 break-all">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="font-mono text-xs text-red-600 mt-2">
                    Error ID: {error.digest}
                  </p>
                )}
                {errorTime && (
                  <p className="font-mono text-xs text-red-600 mt-1">
                    Time: {errorTime.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* 액션 버튼 */}
        <div className="flex gap-4 justify-center mb-8">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className={`ty01 min-w-[120px] ${isRetrying ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isRetrying ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                재시도 중...
              </span>
            ) : (
              '다시 시도'
            )}
          </button>
          <button
            onClick={() => router.push('/')}
            className="ty02 min-w-[120px]"
          >
            홈으로
          </button>
        </div>
        
        {/* 도움말 섹션 */}
        <div className="border-t border-gray-200 pt-8">
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm font-semibold text-blue-800 mb-2">이런 방법을 시도해보세요:</p>
            <ul className="text-sm text-blue-700 text-left space-y-1">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>페이지를 새로고침 해보세요 (Ctrl+R 또는 Cmd+R)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>브라우저 캐시를 삭제해보세요</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>잠시 후 다시 접속해보세요</span>
              </li>
            </ul>
          </div>
          
          <p className="text-sm text-gray-500 mb-2">
            문제가 계속되면 고객 지원팀에 문의해주세요
          </p>
          <div className="flex gap-4 justify-center text-sm">
            <Link href="/help" className="text-primary hover:text-primary-dark transition-colors">
              도움말 센터
            </Link>
            <span className="text-gray-300">|</span>
            <a href="mailto:support@videoplanet.kr" className="text-primary hover:text-primary-dark transition-colors">
              support@videoplanet.kr
            </a>
          </div>
          
          {/* 에러 리포트 번호 (프로덕션 환경) */}
          {process.env.NODE_ENV === 'production' && error.digest && (
            <div className="mt-4 text-xs text-gray-400">
              오류 참조 번호: {error.digest}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}