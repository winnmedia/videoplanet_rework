'use client'

import { SideBar } from '@/widgets'

export default function ContentPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 사이드바 */}
      <SideBar />
      
      {/* 메인 컨텐츠 */}
      <main className="flex-1 ml-[300px] transition-all duration-300">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">콘텐츠</h1>
            <p className="text-gray-600 mt-2">프로젝트 콘텐츠를 관리하세요</p>
          </div>
          
          {/* Content List - TODO: 콘텐츠 목록 컴포넌트 구현 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center text-gray-500 py-12">
              <p>콘텐츠 관리 기능을 곧 제공할 예정입니다.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}