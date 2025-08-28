'use client'

import React from 'react'

import { EmptyState } from './EmptyState'
import { ProjectStatusCard } from './ProjectStatusCard'
import { RecentActivityFeed } from './RecentActivityFeed'
import type { DashboardWidgetProps } from '../model/types'

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  data,
  isLoading = false,
  onProjectClick,
  onRefresh
}) => {
  // 로딩 상태 처리
  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-96 p-8" data-testid="dashboard-loading">
        <div className="w-10 h-10 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="mt-4 text-gray-600">데이터를 불러오고 있습니다...</p>
      </div>
    )
  }

  // 데이터가 없는 경우
  if (!data) {
    return (
      <EmptyState
        title="데이터를 불러올 수 없습니다"
        description="새로고침을 시도해보세요"
        actionLabel="새로고침"
        onAction={onRefresh}
        illustration="error"
      />
    )
  }

  const { stats, recentProjects, recentActivity, upcomingDeadlines } = data

  // 프로젝트가 전혀 없는 경우
  const hasNoProjects = stats.totalProjects === 0

  if (hasNoProjects) {
    return (
      <main className="min-h-screen bg-gray-50 p-8" role="main" aria-label="대시보드">
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900">프로젝트 대시보드</h1>
          {onRefresh && (
            <button 
              className="px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
              onClick={onRefresh}
              aria-label="새로고침"
              type="button"
            >
              <span className="inline-block mr-2 transform transition-transform hover:rotate-180">↻</span>
              새로고침
            </button>
          )}
        </header>

        <div className="flex justify-center items-center min-h-96">
          <EmptyState
            title="아직 생성된 프로젝트가 없습니다"
            description="새로운 프로젝트를 생성해보세요"
            actionLabel="프로젝트 생성하기"
            onAction={() => console.log('Create project')}
            illustration="no-projects"
          />
        </div>
      </main>
    )
  }

  return (
    <main 
      className="min-h-screen bg-gray-50 p-8" 
      role="main" 
      aria-label="대시보드"
      data-testid="dashboard-container"
    >
      {/* 헤더 */}
      <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900">프로젝트 대시보드</h1>
        {onRefresh && (
          <button 
            className="px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
            onClick={onRefresh}
            aria-label="새로고침"
            type="button"
          >
            <span className="inline-block mr-2 transform transition-transform hover:rotate-180">↻</span>
            새로고침
          </button>
        )}
      </header>

      {/* 통계 카드들 */}
      <section 
        className="mb-8"
        role="region"
        aria-label="프로젝트 통계"
        data-testid="stats-container"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm text-center border border-gray-200 hover:shadow-md transition-shadow" data-testid="stats-card">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">전체 프로젝트</h3>
            <div className="text-3xl font-bold text-blue-600">{stats.totalProjects}</div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl shadow-sm text-center border border-gray-200 hover:shadow-md transition-shadow" data-testid="stats-card">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">진행중인 프로젝트</h3>
            <div className="text-3xl font-bold text-blue-600">{stats.activeProjects}</div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl shadow-sm text-center border border-gray-200 hover:shadow-md transition-shadow" data-testid="stats-card">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">완료된 프로젝트</h3>
            <div className="text-3xl font-bold text-blue-600">{stats.completedProjects}</div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl shadow-sm text-center border border-gray-200 hover:shadow-md transition-shadow" data-testid="stats-card">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">팀 멤버</h3>
            <div className="text-3xl font-bold text-blue-600">{stats.totalTeamMembers}</div>
          </div>
        </div>
      </section>

      {/* 메인 콘텐츠 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 최근 프로젝트 */}
        <section 
          className="lg:col-span-2"
          role="region"
          aria-label="최근 프로젝트"
          data-testid="projects-container"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-6">최근 프로젝트</h2>
          <div className="flex flex-col gap-4">
            {recentProjects.length > 0 ? (
              recentProjects.map(project => (
                <div key={project.id} className="relative">
                  <ProjectStatusCard
                    project={project}
                    onClick={onProjectClick}
                    showProgress={true}
                  />
                </div>
              ))
            ) : (
              <EmptyState
                title="최근 프로젝트가 없습니다"
                description="새로운 프로젝트를 생성해보세요"
                illustration="no-projects"
              />
            )}
          </div>
        </section>

        {/* 최근 활동 */}
        <section 
          className="bg-white rounded-3xl shadow-sm p-6 border border-gray-200"
          role="region"
          aria-label="최근 활동"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-6">최근 활동</h2>
          <div>
            {recentActivity.length > 0 ? (
              <RecentActivityFeed
                activities={recentActivity}
                maxItems={5}
                showTimestamp={true}
              />
            ) : (
              <p className="text-gray-500 text-center italic p-4">최근 활동이 없습니다</p>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

// 기본 props 설정
DashboardWidget.displayName = 'DashboardWidget'