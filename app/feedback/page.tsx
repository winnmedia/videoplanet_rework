'use client'

import { FeedbackFilter } from '@/features/feedback'
import { SideBar } from '@/widgets'
import { FeedbackList } from '@/widgets/feedback'

export default function FeedbackPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 사이드바 */}
      <SideBar />
      
      {/* 메인 콘텐츠 */}
      <main className="ml-[18.75rem] pt-20 min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">영상 피드백</h1>
            <p className="text-gray-600 mt-2">프로젝트 피드백을 관리하세요</p>
          </div>
          
          {/* Filters */}
          <div className="mb-6">
            <FeedbackFilter />
          </div>
          
          {/* Feedback List */}
          <FeedbackList />
        </div>
      </main>
    </div>
  )
}