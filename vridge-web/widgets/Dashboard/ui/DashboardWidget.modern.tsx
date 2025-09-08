/**
 * @fileoverview 현대화된 DashboardWidget - Tailwind CSS 기반
 * @description VRidge 초미니멀 디자인 시스템을 적용한 대시보드 위젯
 */

'use client'

import React from 'react'

import { Button, Card } from '../../../shared/ui/index.modern'
import type { DashboardWidgetProps } from '../model/types'

// 로딩 스피너 컴포넌트
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-12" role="status" aria-label="로딩 중">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vridge-500"></div>
    <span className="ml-3 text-gray-600">데이터를 불러오고 있습니다...</span>
  </div>
)

// 빈 상태 컴포넌트
interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  illustration?: 'error' | 'no-projects'
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  title, 
  description, 
  actionLabel, 
  onAction,
  illustration = 'no-projects'
}) => {
  const getIllustrationIcon = () => {
    switch (illustration) {
      case 'error':
        return '⚠️'
      case 'no-projects':
        return '📁'
      default:
        return '📁'
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="text-6xl mb-4 opacity-50">
        {getIllustrationIcon()}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-6 max-w-md">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

// 통계 카드 컴포넌트
interface StatsCardProps {
  title: string
  value: number
  className?: string
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, className }) => (
  <Card 
    variant="default" 
    padding="default"
    className={className}
    data-testid="stats-card"
  >
    <div className="text-center">
      <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
      <div className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</div>
    </div>
  </Card>
)

// 프로젝트 상태 카드 컴포넌트
interface ProjectStatusCardProps {
  project: {
    id: string
    title: string
    status: string
    progress: number
    deadline: string
    teamMembers: string[]
    priority: 'high' | 'medium' | 'low'
  }
  onClick?: (projectId: string) => void
  showProgress?: boolean
}

const ProjectStatusCard: React.FC<ProjectStatusCardProps> = ({ 
  project, 
  onClick,
  showProgress = true 
}) => {
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'in_progress': '진행중',
      'planning': '기획',
      'completed': '완료',
      'review': '검토중'
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'planning':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'review':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card 
      variant="default"
      padding="default"
      clickable={!!onClick}
      onClick={() => onClick?.(project.id)}
      className="hover:shadow-md transition-shadow"
    >
      <div className="space-y-3">
        {/* 헤더 */}
        <div className="flex items-start justify-between">
          <h4 className="text-base font-semibold text-gray-900 truncate flex-1">
            {project.title}
          </h4>
          <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(project.priority)}`}>
            {project.priority === 'high' ? '높음' : project.priority === 'medium' ? '보통' : '낮음'}
          </span>
        </div>

        {/* 상태와 진행률 */}
        <div className="flex items-center justify-between">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
            {getStatusText(project.status)}
          </span>
          {showProgress && (
            <span className="text-sm text-gray-500">
              {project.progress}%
            </span>
          )}
        </div>

        {/* 진행률 바 */}
        {showProgress && (
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-vridge-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        )}

        {/* 마감일과 팀원 */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>마감: {new Date(project.deadline).toLocaleDateString('ko-KR')}</span>
          <span>{project.teamMembers.length}명</span>
        </div>
      </div>
    </Card>
  )
}

// 활동 피드 컴포넌트
interface RecentActivityFeedProps {
  activities: Array<{
    id: string
    type: string
    message: string
    timestamp: string
    user: string
  }>
  maxItems?: number
  showTimestamp?: boolean
}

const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({ 
  activities, 
  maxItems = 5,
  showTimestamp = true 
}) => {
  const displayActivities = activities.slice(0, maxItems)

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'project_created':
        return '📁'
      case 'feedback_received':
        return '💬'
      case 'project_completed':
        return '✅'
      case 'team_joined':
        return '👥'
      default:
        return '📝'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffMinutes < 60) {
      return `${diffMinutes}분 전`
    } else if (diffMinutes < 1440) {
      return `${Math.floor(diffMinutes / 60)}시간 전`
    } else {
      return date.toLocaleDateString('ko-KR')
    }
  }

  return (
    <div className="space-y-4">
      {displayActivities.map((activity) => (
        <div key={activity.id} className="flex items-start space-x-3">
          <div className="flex-shrink-0 text-lg">
            {getActivityIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">
              {activity.message}
            </p>
            <div className="flex items-center mt-1 space-x-2">
              <span className="text-xs font-medium text-gray-500">
                {activity.user}
              </span>
              {showTimestamp && (
                <>
                  <span className="text-xs text-gray-300">•</span>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * 현대화된 DashboardWidget 컴포넌트
 * 
 * @description VRidge 초미니멀 디자인 시스템을 적용한 대시보드
 * Tailwind CSS와 새로운 컴포넌트들을 사용하여 깔끔하고 현대적인 UI를 제공
 */
export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  data,
  isLoading = false,
  onProjectClick,
  onRefresh
}) => {
  // 로딩 상태 처리
  if (isLoading) {
    return <LoadingSpinner />
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
      <main className="min-h-screen bg-gray-50 p-6" role="main" aria-label="대시보드">
        <div className="max-w-7xl mx-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">프로젝트 대시보드</h1>
            {onRefresh && (
              <Button variant="outline" onClick={onRefresh}>
                <span className="refresh-icon mr-2">↻</span>
                새로고침
              </Button>
            )}
          </div>

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
      className="min-h-screen bg-gray-50 p-6" 
      role="main" 
      aria-label="대시보드"
    >
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">프로젝트 대시보드</h1>
          {onRefresh && (
            <Button variant="outline" onClick={onRefresh}>
              <span className="refresh-icon mr-2">↻</span>
              새로고침
            </Button>
          )}
        </div>

        {/* 통계 카드들 */}
        <section 
          className="mb-8"
          role="region"
          aria-label="프로젝트 통계"
          data-testid="stats-container"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="전체 프로젝트"
              value={stats.totalProjects}
            />
            <StatsCard
              title="진행중인 프로젝트"
              value={stats.activeProjects}
            />
            <StatsCard
              title="완료된 프로젝트"
              value={stats.completedProjects}
            />
            <StatsCard
              title="팀 멤버"
              value={stats.totalTeamMembers}
            />
          </div>
        </section>

        {/* 메인 콘텐츠 그리드 */}
        <div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          data-testid="dashboard-container"
        >
          {/* 최근 프로젝트 */}
          <section 
            className="lg:col-span-2"
            role="region"
            aria-label="최근 프로젝트"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-6">최근 프로젝트</h2>
            <div className="space-y-4">
              {recentProjects.length > 0 ? (
                recentProjects.map(project => (
                  <ProjectStatusCard
                    key={project.id}
                    project={project as any}
                    onClick={onProjectClick}
                    showProgress={true}
                  />
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
            className="lg:col-span-1"
            role="region"
            aria-label="최근 활동"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-6">최근 활동</h2>
            <Card variant="default" padding="default">
              {recentActivity.length > 0 ? (
                <RecentActivityFeed
                  activities={recentActivity as any}
                  maxItems={5}
                  showTimestamp={true}
                />
              ) : (
                <p className="text-center text-gray-500 py-8">최근 활동이 없습니다</p>
              )}
            </Card>
          </section>
        </div>
      </div>
    </main>
  )
}

// 기본 props 설정
DashboardWidget.displayName = 'DashboardWidget'