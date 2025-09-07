'use client'

import { useState } from 'react'

// import { EyeIcon, EyeSlashIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { ColorAssignmentService, CALENDAR_CLASSES } from '@/entities/calendar/lib/colorAssignment'
import type { ProjectLegendItem } from '@/entities/project/model/calendar-types'

interface ProjectLegendProps {
  legendItems: ProjectLegendItem[]
  showMyProjectsOnly: boolean
  onToggleProject: (projectId: string, visible: boolean) => void
  onToggleMode: (showMyProjectsOnly: boolean) => void
}

export function ProjectLegend({
  legendItems,
  showMyProjectsOnly,
  onToggleProject,
  onToggleMode
}: ProjectLegendProps) {
  const [scrollPosition, setScrollPosition] = useState(0)
  const itemWidth = 180 // 각 범례 아이템의 대략적인 너비
  const visibleItems = 4 // 한 번에 보이는 아이템 수

  const handleScroll = (direction: 'left' | 'right') => {
    const maxScroll = Math.max(0, (legendItems.length - visibleItems) * itemWidth)
    
    if (direction === 'left') {
      setScrollPosition(Math.max(0, scrollPosition - itemWidth * 2))
    } else {
      setScrollPosition(Math.min(maxScroll, scrollPosition + itemWidth * 2))
    }
  }

  const canScrollLeft = scrollPosition > 0
  const canScrollRight = scrollPosition < (legendItems.length - visibleItems) * itemWidth

  const displayedItems = showMyProjectsOnly 
    ? legendItems.filter(item => item.project.manager === '현재 사용자') // TODO: 실제 사용자 정보로 교체
    : legendItems

  const visibleProjectsCount = displayedItems.filter(item => item.isVisible).length
  const totalProjectsCount = displayedItems.length

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* 범례 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-800">프로젝트 범례</h3>
          <span className="text-xs text-gray-500">
            {visibleProjectsCount}/{totalProjectsCount}개 표시
          </span>
        </div>
        
        {/* 모드 토글 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleMode(false)}
            className={`px-3 py-1 text-xs rounded-md transition-colors duration-200 ${
              !showMyProjectsOnly 
                ? 'bg-blue-100 text-blue-800 font-medium' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            전체 프로젝트
          </button>
          <button
            onClick={() => onToggleMode(true)}
            className={`px-3 py-1 text-xs rounded-md transition-colors duration-200 ${
              showMyProjectsOnly 
                ? 'bg-blue-100 text-blue-800 font-medium' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            내 프로젝트
          </button>
        </div>
      </div>

      {/* 범례 스크롤 영역 */}
      <div className="relative">
        {/* 왼쪽 스크롤 버튼 */}
        {canScrollLeft && (
          <button
            onClick={() => handleScroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-300 rounded-full p-1 shadow-sm hover:bg-gray-50 transition-colors duration-200"
            aria-label="이전 프로젝트 보기"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* 오른쪽 스크롤 버튼 */}
        {canScrollRight && (
          <button
            onClick={() => handleScroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-300 rounded-full p-1 shadow-sm hover:bg-gray-50 transition-colors duration-200"
            aria-label="다음 프로젝트 보기"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* 범례 아이템 컨테이너 */}
        <div className="overflow-hidden mx-6">
          <div 
            className="flex transition-transform duration-300 ease-in-out gap-3"
            style={{ transform: `translateX(-${scrollPosition}px)` }}
          >
            {displayedItems.map((item, index) => {
              // Tailwind 색상 클래스 생성
              const tailwindClasses = ColorAssignmentService.getProjectTailwindClasses(item.project.id, index)
              
              return (
                <div
                  key={item.project.id}
                  className={`
                    flex-shrink-0 flex items-center gap-2 p-3 rounded-lg border
                    transition-all duration-200 cursor-pointer
                    ${item.isVisible 
                      ? 'bg-white border-gray-200 shadow-sm' 
                      : 'bg-gray-50 border-gray-200 opacity-60'
                    }
                    hover:shadow-md hover:border-gray-300
                  `}
                  onClick={() => onToggleProject(item.project.id, !item.isVisible)}
                  style={{ minWidth: `${itemWidth - 12}px` }} // 간격 고려
                >
                  {/* 가시성 토글 아이콘 */}
                  <button
                    className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors duration-200"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleProject(item.project.id, !item.isVisible)
                    }}
                    aria-label={item.isVisible ? '프로젝트 숨기기' : '프로젝트 보이기'}
                  >
                    {item.isVisible ? (
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    )}
                  </button>

                  {/* 프로젝트 색상 스와치 - Tailwind 클래스 사용 */}
                  <div 
                    className={`flex-shrink-0 w-4 h-4 rounded-sm border-2 border-white shadow-sm ${tailwindClasses.bg}`}
                    title={`${item.project.name} 색상`}
                  />

                  {/* 프로젝트 정보 */}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {item.project.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.phaseCount}개 페이즈
                    </div>
                  </div>

                  {/* 프로젝트 상태 표시 */}
                  <div className="flex-shrink-0">
                    <span 
                      className={`
                        inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium
                        ${item.project.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : item.project.status === 'cancelled'
                        ? 'bg-blue-100 text-blue-800'
                        : item.project.status === 'on-hold'
                        ? 'bg-yellow-100 text-yellow-800'
                        : item.project.status === 'completed'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-red-100 text-red-800'
                      }
                    `}
                  >
                    {item.project.status === 'active' && '진행중'}
                    {item.project.status === 'active' && '활성'}
                    {item.project.status === 'on-hold' && '대기'}
                    {item.project.status === 'completed' && '완료'}
                    {item.project.status === 'cancelled' && '취소'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 빈 상태 */}
        {displayedItems.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">
              {showMyProjectsOnly ? '내 프로젝트가 없습니다' : '표시할 프로젝트가 없습니다'}
            </p>
          </div>
        )}
      </div>

      {/* 범례 액션 */}
      {displayedItems.length > 0 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded ${CALENDAR_CLASSES.PROGRESS_BAR}`} />
              <span>진행률</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded ${CALENDAR_CLASSES.CONFLICT_BG} ${CALENDAR_CLASSES.CONFLICT_BORDER} border-2`} />
              <span>충돌</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                displayedItems.forEach(item => {
                  onToggleProject(item.project.id, true)
                })
              }}
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors duration-200"
            >
              모두 보기
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => {
                displayedItems.forEach(item => {
                  onToggleProject(item.project.id, false)
                })
              }}
              className="text-xs text-gray-600 hover:text-gray-800 transition-colors duration-200"
            >
              모두 숨기기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}