'use client'

import { ProjectStats } from '@/widgets/dashboard'
import { RecentActivity } from '@/widgets/dashboard'
import { QuickActions } from '@/features/project'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
          <p className="text-gray-600 mt-2">프로젝트 현황을 한눈에 확인하세요</p>
        </div>
        
        {/* Stats Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">프로젝트 현황</h2>
          <ProjectStats />
        </div>
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">최근 활동</h2>
              <RecentActivity />
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
    </div>
  )
}