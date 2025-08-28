'use client'

import { SideBar } from '@/widgets'

interface PlanningDetailPageProps {
  params: Promise<{
    type: string
  }>
}

export default async function PlanningDetailPage({ params }: PlanningDetailPageProps) {
  const { type } = await params
  
  // Mock 기획 데이터
  const planningData = {
    'concept': {
      title: '컨셉 기획',
      description: '프로젝트의 핵심 컨셉과 방향성을 설정합니다',
      content: '브랜드의 핵심 가치를 전달하는 감성적이고 임팩트 있는 영상 컨셉을 기획합니다.',
      status: 'active',
      progress: 75
    },
    'script': {
      title: '대본 작성',
      description: '영상의 스토리와 내레이션 대본을 작성합니다',
      content: '시청자의 감정을 자극하고 브랜드 메시지를 효과적으로 전달할 수 있는 대본을 작성합니다.',
      status: 'pending',
      progress: 0
    },
    'storyboard': {
      title: '스토리보드',
      description: '장면별 구성과 시각적 연출 방향을 설정합니다',
      content: '각 장면의 구도, 카메라 앵글, 전환 효과 등을 시각적으로 구성합니다.',
      status: 'completed',
      progress: 100
    },
    'shot-list': {
      title: '촬영 리스트',
      description: '실제 촬영에 필요한 샷 리스트를 작성합니다',
      content: '효율적인 촬영을 위한 상세한 샷 리스트와 촬영 순서를 계획합니다.',
      status: 'pending',
      progress: 25
    }
  }
  
  const planning = planningData[type as keyof typeof planningData]
  
  if (!planning) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <SideBar />
        <main className="flex-1 ml-sidebar pt-20 transition-all duration-300">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">기획 페이지를 찾을 수 없습니다</h1>
              <p className="text-gray-600">요청하신 기획 페이지가 존재하지 않습니다.</p>
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
            <h1 className="text-3xl font-bold text-gray-900">{planning.title}</h1>
            <p className="text-gray-600 mt-2">{planning.description}</p>
          </div>
          
          {/* Planning Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-4">기획 내용</h2>
                <div className="space-y-4">
                  <div>
                    <span className="font-medium text-gray-900">상태:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-sm ${
                      planning.status === 'active' ? 'bg-green-100 text-green-800' :
                      planning.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {planning.status === 'active' ? '진행중' : 
                       planning.status === 'completed' ? '완료' : '대기중'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">진행률:</span>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${planning.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 mt-1 block">{planning.progress}%</span>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">설명:</span>
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-700">{planning.content}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Planning Tools */}
              <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">작업 도구</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="text-center">
                      <div className="text-2xl mb-2">📝</div>
                      <span className="text-sm font-medium">템플릿 사용</span>
                    </div>
                  </button>
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="text-center">
                      <div className="text-2xl mb-2">🤖</div>
                      <span className="text-sm font-medium">AI 도움받기</span>
                    </div>
                  </button>
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="text-center">
                      <div className="text-2xl mb-2">👥</div>
                      <span className="text-sm font-medium">팀과 협업</span>
                    </div>
                  </button>
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="text-center">
                      <div className="text-2xl mb-2">📊</div>
                      <span className="text-sm font-medium">진행률 확인</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Sidebar */}
            <div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">기획 정보</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">기획 타입</span>
                    <p className="text-sm text-gray-900">{type}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">최종 수정</span>
                    <p className="text-sm text-gray-900">2025-08-28</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">담당자</span>
                    <p className="text-sm text-gray-900">기획팀</p>
                  </div>
                </div>
                
                <div className="mt-6 space-y-3">
                  <button className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors">
                    편집하기
                  </button>
                  <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-50 transition-colors">
                    공유하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}