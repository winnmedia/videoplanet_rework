'use client'

import { QuickActions } from '@/features/project'
import { SideBar } from '@/widgets'
import { ProjectStatusCard } from '@/widgets/Dashboard'
import { RecentActivityFeed } from '@/widgets/Dashboard'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 사이드바 */}
      <SideBar />
      
      {/* 메인 컨텐츠 */}
      <main className="flex-1 ml-[300px] transition-all duration-300">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
            <p className="text-gray-600 mt-2">프로젝트 현황을 한눈에 확인하세요</p>
          </div>
          
          {/* Stats Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">프로젝트 현황</h2>
            <ProjectStatusCard project={{
              id: '1',
              title: '샘플 프로젝트',
              status: 'shooting',
              progress: 65,
              teamMembers: 3
            } as any} />
          </div>
          
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">최근 활동</h2>
                <RecentActivityFeed />
              </div>
            </div>
            <div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">빠른 작업</h2>
                <QuickActions />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}