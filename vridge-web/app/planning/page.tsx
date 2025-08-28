'use client'

import { Metadata } from 'next'
import { SideBar } from '@/widgets'
import { VideoPlanningWizard } from '@/features/video-planning-wizard'

export default function PlanningPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 사이드바 */}
      <SideBar />
      
      {/* 메인 콘텐츠 */}
      <main className="ml-[18.75rem] pt-20 min-h-screen">
        <div className="container mx-auto px-6 py-12 max-w-7xl">
          {/* 페이지 헤더 - 전문적이고 현대적 */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight">영상 기획</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    프로페셔널
                  </span>
                  <span className="text-sm text-gray-500">통합 워크스페이스</span>
                </div>
              </div>
            </div>
            <p className="text-lg text-gray-600 max-w-2xl">
              컨셉부터 샷리스트까지 모든 기획 과정을 하나의 워크스페이스에서 관리하세요. 
              AI 지원으로 더욱 효율적인 영상 제작 계획을 세울 수 있습니다.
            </p>
          </div>
          
          {/* 새로운 영상 기획 위저드 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <VideoPlanningWizard 
              onComplete={(result) => {
                console.log('기획 완료:', result)
                // 실제 구현에서는 결과를 저장하거나 다른 페이지로 이동
              }}
              onError={(error) => {
                console.error('기획 오류:', error)
                // 실제 구현에서는 사용자에게 친화적인 오류 메시지 표시
              }}
            />
          </div>
        </div>
      </main>
    </div>
  )
}