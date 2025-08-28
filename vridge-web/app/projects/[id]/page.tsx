'use client'

import { useParams } from 'next/navigation'
import { SideBar } from '@/widgets'

export default function ProjectDetailPage() {
  const params = useParams()
  const id = params?.id as string
  
  // params가 없거나 id가 없을 경우 에러 처리
  if (!id) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <SideBar />
        <main className="flex-1 ml-sidebar pt-20 transition-all duration-300">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">잘못된 접근</h1>
              <p className="text-gray-600">프로젝트 ID가 필요합니다.</p>
            </div>
          </div>
        </main>
      </div>
    )
  }
  
  // Mock 프로젝트 데이터
  const mockProjects = {
    '1': { title: '웹사이트 리뉴얼 프로젝트', status: 'active', progress: 65 },
    '2': { title: '모바일 앱 개발', status: 'active', progress: 30 },
    '3': { title: '브랜딩 영상 제작', status: 'completed', progress: 100 },
    '4': { title: 'UI/UX 디자인 시스템', status: 'active', progress: 85 }
  }
  
  const project = mockProjects[id as keyof typeof mockProjects]
  
  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <SideBar />
        <main className="flex-1 ml-sidebar pt-20 transition-all duration-300">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">프로젝트를 찾을 수 없습니다</h1>
              <p className="text-gray-600">요청하신 프로젝트가 존재하지 않습니다.</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SideBar />
      <main className="flex-1 ml-sidebar pt-20 transition-all duration-300">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
            <p className="text-gray-600 mt-2">프로젝트 상세 정보</p>
          </div>
          
          {/* Project Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-4">프로젝트 개요</h2>
                <div className="space-y-4">
                  <div>
                    <span className="font-medium text-gray-900">상태:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-sm ${
                      project.status === 'active' ? 'bg-green-100 text-green-800' :
                      project.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {project.status === 'active' ? '진행중' : 
                       project.status === 'completed' ? '완료' : '대기'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">진행률:</span>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 mt-1 block">{project.progress}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Sidebar */}
            <div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">프로젝트 정보</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">프로젝트 ID</span>
                    <p className="text-sm text-gray-900">{id}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">생성일</span>
                    <p className="text-sm text-gray-900">2025-08-28</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">팀 구성원</span>
                    <p className="text-sm text-gray-900">3명</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}