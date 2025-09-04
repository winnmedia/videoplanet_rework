'use client'

import { useRouter } from 'next/navigation'

type ProjectStatus = 'active' | 'pending' | 'completed'

interface Project {
  id: number
  title: string
  status: ProjectStatus
  progress: number
  description?: string
  dueDate?: string
}

export function ProjectList() {
  const router = useRouter()
  
  const projects: Project[] = [
    { 
      id: 1, 
      title: '회사 소개 영상', 
      status: 'active', 
      progress: 65,
      description: '브랜드 아이덴티티를 담은 회사 소개 영상',
      dueDate: '2025-09-15'
    },
    { 
      id: 2, 
      title: '제품 홍보 비디오', 
      status: 'active', 
      progress: 30,
      description: '신제품 런칭을 위한 홍보 영상',
      dueDate: '2025-09-30'
    },
    { 
      id: 3, 
      title: '교육 콘텐츠 시리즈', 
      status: 'pending', 
      progress: 0,
      description: '직원 온보딩용 교육 영상 시리즈',
      dueDate: '2025-10-15'
    },
    { 
      id: 4, 
      title: '브랜드 캠페인', 
      status: 'completed', 
      progress: 100,
      description: '소셜 미디어 캠페인용 영상 콘텐츠',
      dueDate: '2025-08-20'
    }
  ]
  
  const getStatusConfig = (status: ProjectStatus) => {
    switch(status) {
      case 'active': 
        return {
          color: 'text-success-600 bg-success-50',
          label: '진행중',
          progressColor: 'bg-success-500'
        }
      case 'pending': 
        return {
          color: 'text-warning-600 bg-warning-50',
          label: '대기',
          progressColor: 'bg-warning-500'
        }
      case 'completed': 
        return {
          color: 'text-neutral-600 bg-neutral-100',
          label: '완료',
          progressColor: 'bg-primary'
        }
      default: 
        return {
          color: 'text-neutral-600 bg-neutral-100',
          label: status,
          progressColor: 'bg-neutral-400'
        }
    }
  }
  
  const handleProjectClick = (projectId: number) => {
    router.push(`/projects/${projectId}`)
  }
  
  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 text-neutral-300">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p className="text-neutral-500 text-lg mb-4">아직 등록된 프로젝트가 없습니다</p>
        <button 
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
          onClick={() => router.push('/projects/create')}
        >
          첫 프로젝트 시작하기
        </button>
      </div>
    )
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map(project => {
        const statusConfig = getStatusConfig(project.status)
        
        return (
          <article 
            key={project.id} 
            className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200 hover:shadow-md hover:border-neutral-300 transition-all duration-200 cursor-pointer group"
            onClick={() => handleProjectClick(project.id)}
            data-testid={`project-card-${project.id}`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleProjectClick(project.id)
              }
            }}
          >
            <header className="mb-4">
              <h3 className="font-semibold text-lg text-neutral-900 mb-2 group-hover:text-primary transition-colors">
                {project.title}
              </h3>
              {project.description && (
                <p className="text-sm text-neutral-600 line-clamp-2">
                  {project.description}
                </p>
              )}
            </header>
            
            <div className="flex justify-between items-center mb-4">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
              <span className="text-sm text-neutral-500 font-medium">
                {project.progress}%
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="w-full bg-neutral-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${statusConfig.progressColor}`}
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
            
            {/* Due Date */}
            {project.dueDate && (
              <footer className="text-xs text-neutral-500 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                마감일: {new Date(project.dueDate).toLocaleDateString('ko-KR')}
              </footer>
            )}
          </article>
        )
      })}
    </div>
  )
}