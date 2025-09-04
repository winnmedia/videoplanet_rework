'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function NotFound() {
  const router = useRouter()
  const [path, setPath] = useState('')
  
  useEffect(() => {
    // 클라이언트 사이드에서만 현재 경로 가져오기
    setPath(window.location.pathname)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center px-4 max-w-2xl">
        {/* 에러 코드 및 아이콘 */}
        <div className="relative mb-8">
          <div className="text-[150px] font-bold text-gray-200 select-none">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-24 h-24 text-primary opacity-80"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
        
        {/* 에러 메시지 */}
        <h1 className="text-3xl font-bold text-dark mb-4">
          페이지를 찾을 수 없습니다
        </h1>
        
        <p className="text-gray-600 mb-2">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>
        
        {path && (
          <div className="bg-gray-100 rounded-lg px-4 py-2 inline-block mb-8">
            <code className="text-sm text-gray-700">{path}</code>
          </div>
        )}
        
        {/* 액션 버튼 */}
        <div className="flex gap-4 justify-center mb-8">
          <button
            onClick={() => router.back()}
            className="ty02 min-w-[120px]"
          >
            이전으로
          </button>
          <Link href="/">
            <button className="ty01 min-w-[120px]">
              홈으로
            </button>
          </Link>
        </div>
        
        {/* 추가 도움말 */}
        <div className="border-t border-gray-200 pt-8">
          <p className="text-sm text-gray-500 mb-2">
            계속해서 문제가 발생한다면
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
        </div>
        
        {/* 자주 찾는 페이지 */}
        <div className="mt-8 p-4 bg-white rounded-lg shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">자주 찾는 페이지</p>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/projects" className="text-sm text-primary hover:underline">
              프로젝트 목록
            </Link>
            <Link href="/dashboard" className="text-sm text-primary hover:underline">
              대시보드
            </Link>
            <Link href="/feedback" className="text-sm text-primary hover:underline">
              피드백
            </Link>
            <Link href="/planning" className="text-sm text-primary hover:underline">
              기획
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}