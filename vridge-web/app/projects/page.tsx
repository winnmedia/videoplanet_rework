'use client'

import { CreateProjectButton } from '@/features/project'
import { ProjectFilter } from '@/features/project'
import { SideBar } from '@/widgets'
import { ProjectList } from '@/widgets/projects'

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 사이드바 */}
      <SideBar />
      
      {/* 메인 컨텐츠 */}
      <main className="flex-1 ml-[300px] transition-all duration-300">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Page Header */}
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">프로젝트</h1>
              <p className="text-gray-600 mt-2">모든 프로젝트를 관리하세요</p>
            </div>
            <CreateProjectButton />
          </div>
          
          {/* Filters */}
          <div className="mb-6">
            <ProjectFilter />
          </div>
          
          {/* Projects Grid */}
          <ProjectList />
        </div>
      </main>
    </div>
  )
}