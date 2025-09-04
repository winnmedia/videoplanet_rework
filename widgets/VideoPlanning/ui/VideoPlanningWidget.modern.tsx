/**
 * @fileoverview 신규 초미니멀 Video Planning Widget - Tailwind CSS 기반
 * @description 슬라이드 메뉴 없이 모든 기획 도구를 한 화면에서 직접 접근하는 통합 워크스페이스
 * @version 2.0 - Modern Stack (Tailwind CSS)
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

import { cn } from '@/shared/lib/utils'
import { Card, Button } from '@/shared/ui/index.modern'

// 기획 도구 타입 정의
type PlanningTool = 'concept' | 'script' | 'storyboard' | 'shotList'
type PlanningLayout = 'grid' | 'list' | 'compact'

interface PlanningToolData {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  status: 'empty' | 'loading' | 'ready' | 'error'
  progress: number
  lastModified?: Date
  isActive: boolean
}

interface VideoPlanningModernProps {
  projectId: string
  className?: string
  onToolActivate?: (tool: PlanningTool) => void
}

/**
 * 각 도구별 아이콘 컴포넌트 (초미니멀)
 */
const ToolIcons = {
  concept: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  script: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  storyboard: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  shotList: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}

/**
 * 진행률 표시 컴포넌트
 */
const ProgressRing = ({ progress, size = 48 }: { progress: number; size?: number }) => {
  const radius = (size - 4) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="text-vridge-500 transition-all duration-300 ease-out"
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-xs font-medium text-gray-700">
        {progress}%
      </span>
    </div>
  )
}

/**
 * 도구 카드 컴포넌트
 */
const PlanningToolCard = ({ 
  tool, 
  data, 
  layout,
  onActivate, 
  onExpand 
}: {
  tool: PlanningTool
  data: PlanningToolData
  layout: PlanningLayout
  onActivate: () => void
  onExpand: () => void
}) => {
  const isCompact = layout === 'compact'
  const isList = layout === 'list'

  return (
    <Card 
      className={cn(
        'group relative overflow-hidden transition-all duration-300 hover:shadow-md',
        'border border-gray-200 hover:border-gray-300',
        data.isActive && 'ring-2 ring-vridge-500 border-vridge-300 bg-vridge-50/30',
        isCompact && 'p-3',
        !isCompact && 'p-6'
      )}
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onActivate()
        }
      }}
      aria-label={`${data.title} 도구 ${data.isActive ? '활성화됨' : '비활성화됨'}`}
    >
      <div className={cn(
        'flex items-start gap-4',
        isList ? 'flex-row' : 'flex-col',
        isCompact && 'gap-2'
      )}>
        {/* 도구 아이콘 및 상태 */}
        <div className="flex-shrink-0 relative">
          <div className={cn(
            'rounded-lg flex items-center justify-center transition-colors',
            data.isActive 
              ? 'bg-vridge-500 text-white' 
              : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200',
            isCompact ? 'w-10 h-10' : 'w-12 h-12'
          )}>
            {data.icon}
          </div>
          
          {/* 상태 인디케이터 */}
          {data.status === 'loading' && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-warning-500 rounded-full animate-pulse" />
          )}
          {data.status === 'error' && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-error-500 rounded-full" />
          )}
        </div>

        {/* 도구 정보 */}
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            'font-medium text-gray-900 truncate',
            isCompact ? 'text-sm' : 'text-base'
          )}>
            {data.title}
          </h3>
          
          {!isCompact && (
            <>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {data.description}
              </p>
              
              {data.lastModified && (
                <p className="text-xs text-gray-500 mt-2">
                  {data.lastModified.toLocaleString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })} 수정
                </p>
              )}
            </>
          )}
        </div>

        {/* 진행률 및 액션 */}
        <div className="flex-shrink-0 flex items-center gap-3">
          {!isCompact && (
            <ProgressRing progress={data.progress} size={isCompact ? 32 : 40} />
          )}
          
          <Button
            size="sm"
            variant={data.isActive ? "primary" : "ghost"}
            onClick={(e) => {
              e.stopPropagation()
              onExpand()
            }}
            className={cn(
              'opacity-0 group-hover:opacity-100 transition-opacity',
              data.isActive && 'opacity-100'
            )}
          >
            {data.isActive ? '편집' : '시작'}
          </Button>
        </div>
      </div>

      {/* 활성 상태 표시선 */}
      {data.isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-vridge-500 to-vridge-600" />
      )}
    </Card>
  )
}

/**
 * 메인 Video Planning Widget (Modern)
 */
export const VideoPlanningModernWidget = ({
  projectId,
  className,
  onToolActivate
}: VideoPlanningModernProps) => {
  // 상태 관리
  const [activeTools, setActiveTools] = useState<Set<PlanningTool>>(new Set())
  const [layout, setLayout] = useState<PlanningLayout>('grid')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 도구 데이터 (실제로는 API에서 가져옴)
  const [toolsData] = useState<Record<PlanningTool, PlanningToolData>>(() => ({
    concept: {
      id: 'concept',
      title: '컨셉 기획',
      description: '영상의 핵심 아이디어와 컨셉을 정의하고 개발합니다',
      icon: ToolIcons.concept,
      status: 'ready',
      progress: 75,
      lastModified: new Date('2025-08-27T10:30:00'),
      isActive: false
    },
    script: {
      id: 'script',
      title: '스크립트 작성',
      description: '대본을 작성하고 편집하여 스토리텔링을 완성합니다',
      icon: ToolIcons.script,
      status: 'ready',
      progress: 45,
      lastModified: new Date('2025-08-26T16:45:00'),
      isActive: false
    },
    storyboard: {
      id: 'storyboard',
      title: '스토리보드',
      description: '시각적 스토리보드로 장면 구성과 연출을 계획합니다',
      icon: ToolIcons.storyboard,
      status: 'ready',
      progress: 20,
      lastModified: new Date('2025-08-25T09:15:00'),
      isActive: false
    },
    shotList: {
      id: 'shotList',
      title: '샷 리스트',
      description: '상세한 촬영 계획과 샷 구성을 관리합니다',
      icon: ToolIcons.shotList,
      status: 'empty',
      progress: 0,
      isActive: false
    }
  }))

  // 전체 진행률 계산
  const overallProgress = useMemo(() => {
    const tools = Object.values(toolsData)
    const totalProgress = tools.reduce((sum, tool) => sum + tool.progress, 0)
    return Math.round(totalProgress / tools.length)
  }, [toolsData])

  // 도구 활성화 핸들러
  const handleToolActivate = useCallback((tool: PlanningTool) => {
    setActiveTools(prev => {
      const newSet = new Set(prev)
      if (newSet.has(tool)) {
        newSet.delete(tool)
      } else {
        newSet.add(tool)
      }
      return newSet
    })
    
    // 도구 데이터 업데이트
    toolsData[tool].isActive = !toolsData[tool].isActive
    
    onToolActivate?.(tool)
  }, [onToolActivate, toolsData])

  // 도구 확장 핸들러 (상세 편집으로 이동)
  const handleToolExpand = useCallback((tool: PlanningTool) => {
    // 실제 구현에서는 해당 도구의 상세 편집 화면으로 전환
    console.log(`Expanding tool: ${tool}`)
  }, [])

  // 초기 로딩
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000) // 실제로는 API 호출
    
    return () => clearTimeout(timer)
  }, [projectId])

  // 로딩 상태
  if (isLoading) {
    return (
      <div className={cn('animate-pulse space-y-6', className)}>
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-10 bg-gray-200 rounded w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  // 에러 상태
  if (error) {
    return (
      <Card className="p-8 text-center">
        <div className="text-error-500 text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">문제가 발생했습니다</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => setError(null)}>
          다시 시도
        </Button>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)} role="main" aria-label="영상 기획 워크스페이스">
      {/* 헤더 - 프로젝트 개요 및 전체 진행률 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">
            통합 영상 기획 워크스페이스
          </h1>
          <p className="text-gray-600">
            모든 기획 도구를 한 곳에서 관리하고 효율적으로 협업하세요
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* 전체 진행률 */}
          <div className="flex items-center gap-3">
            <ProgressRing progress={overallProgress} size={52} />
            <div className="text-sm">
              <div className="font-medium text-gray-900">전체 진행률</div>
              <div className="text-gray-600">{overallProgress}% 완료</div>
            </div>
          </div>
          
          {/* 레이아웃 전환 */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['grid', 'list', 'compact'] as const).map((layoutType) => (
              <button
                key={layoutType}
                onClick={() => setLayout(layoutType)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  layout === layoutType
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
                aria-label={`${layoutType} 레이아웃으로 전환`}
              >
                {layoutType === 'grid' && '격자'}
                {layoutType === 'list' && '목록'}
                {layoutType === 'compact' && '간결'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 활성 도구 표시 */}
      {activeTools.size > 0 && (
        <Card className="p-4 bg-vridge-50/50 border-vridge-200">
          <div className="flex items-center gap-2 text-sm text-vridge-700">
            <span className="font-medium">
              현재 작업 중: 
            </span>
            {Array.from(activeTools).map(tool => toolsData[tool].title).join(', ')}
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setActiveTools(new Set())}
              className="ml-auto text-xs"
            >
              모두 정리
            </Button>
          </div>
        </Card>
      )}

      {/* 기획 도구 그리드 */}
      <div className={cn(
        'gap-6',
        layout === 'grid' && 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
        layout === 'list' && 'space-y-4',
        layout === 'compact' && 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4'
      )}>
        {(['concept', 'script', 'storyboard', 'shotList'] as const).map((tool) => (
          <PlanningToolCard
            key={tool}
            tool={tool}
            data={toolsData[tool]}
            layout={layout}
            onActivate={() => handleToolActivate(tool)}
            onExpand={() => handleToolExpand(tool)}
          />
        ))}
      </div>

      {/* 빠른 액션 */}
      <Card className="p-6">
        <h3 className="font-medium text-gray-900 mb-4">빠른 액션</h3>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            onClick={() => {
              // 모든 도구 활성화
              setActiveTools(new Set(['concept', 'script', 'storyboard', 'shotList']))
              Object.values(toolsData).forEach(tool => tool.isActive = true)
            }}
          >
            모든 도구 활성화
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              // 진행률 새로고침
              console.log('Refreshing progress...')
            }}
          >
            진행률 새로고침
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              // 자동 저장
              console.log('Auto-saving...')
            }}
          >
            수동 저장
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              // 프로젝트 내보내기
              console.log('Exporting project...')
            }}
          >
            프로젝트 내보내기
          </Button>
        </div>
      </Card>
    </div>
  )
}

// 기본 내보내기
export default VideoPlanningModernWidget