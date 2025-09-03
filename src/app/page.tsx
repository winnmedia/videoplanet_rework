'use client'

import { Typography } from "@/shared/ui/Typography/Typography"
import { Button } from "@/shared/ui/Button/Button"
import { useGetDashboardSummaryQuery } from "@/shared/api/dashboard"
import { 
  selectCurrentData, 
  selectUIState, 
  selectViewModelCache,
  updateViewModelCache
} from "@/entities/dashboard"
import { useAppSelector, useAppDispatch } from "@/app/store"
import { transformDashboardToViewModel } from "@/shared/lib/dashboard-mappers"
import { useEffect } from "react"

export default function Dashboard() {
  const dispatch = useAppDispatch()
  
  // RTK Query로 데이터 fetching
  const {
    data: dashboardData,
    error,
    isLoading,
    isError,
    refetch
  } = useGetDashboardSummaryQuery()
  
  // Redux 상태 조회
  const currentData = useAppSelector(selectCurrentData)
  const uiState = useAppSelector(selectUIState)
  const viewModelCache = useAppSelector(selectViewModelCache)
  
  // 데이터 변환 및 캐싱 로직
  useEffect(() => {
    if (dashboardData && !isLoading && !isError) {
      const transformedData = transformDashboardToViewModel(dashboardData)
      
      // 캐시가 없거나 데이터가 변경된 경우에만 업데이트
      if (!viewModelCache || viewModelCache.lastUpdated < Date.now() - 30000) {
        dispatch(updateViewModelCache({
          data: transformedData,
          lastUpdated: Date.now()
        }))
      }
    }
  }, [dashboardData, isLoading, isError, viewModelCache, dispatch])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-neutral-600">대시보드 로딩 중...</span>
      </div>
    )
  }

  if (isError || !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <Typography variant="h3" className="mb-2">
          데이터를 불러올 수 없습니다
        </Typography>
        <Typography variant="body" className="text-neutral-600 mb-4">
          대시보드 정보를 가져오는 중 문제가 발생했습니다.
        </Typography>
        <Button variant="primary" onClick={() => refetch()}>
          다시 시도
        </Button>
      </div>
    )
  }

  // 캐시된 데이터가 있으면 사용, 없으면 실시간 변환
  const displayData = viewModelCache?.data || transformDashboardToViewModel(dashboardData)

  return (
    <div className="min-h-screen bg-background-primary">
      <div className="max-w-screen-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Typography 
            variant="h1" 
            className="text-neutral-900 mb-2"
          >
            VideoPlanet 대시보드
          </Typography>
          <Typography 
            variant="body" 
            className="text-neutral-600"
          >
            프로젝트와 콘텐츠를 한눈에 관리하세요
          </Typography>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* 활성 프로젝트 카드 */}
          <div className="bg-background-card rounded-admin-lg p-6 border border-border-light">
            <div className="flex items-center justify-between mb-4">
              <Typography variant="h3" className="text-neutral-800">
                활성 프로젝트
              </Typography>
              <div className="w-10 h-10 bg-primary-100 rounded-admin flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-semibold text-neutral-900">
                  {displayData.activeProjects}
                </span>
                <span className="text-sm text-admin-success font-medium">
                  +{displayData.newProjectsThisMonth} 이번 달
                </span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2">
                <div 
                  className="bg-primary-500 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, (displayData.activeProjects / 20) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* 총 사용자 카드 */}
          <div className="bg-background-card rounded-admin-lg p-6 border border-border-light">
            <div className="flex items-center justify-between mb-4">
              <Typography variant="h3" className="text-neutral-800">
                총 사용자
              </Typography>
              <div className="w-10 h-10 bg-blue-100 rounded-admin flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-semibold text-neutral-900">
                  {displayData.totalUsers}
                </span>
                <span className="text-sm text-admin-success font-medium">
                  +{displayData.newUsersThisWeek} 이번 주
                </span>
              </div>
              <div className="text-sm text-neutral-600">
                활성 사용자: {displayData.activeUsers}
              </div>
            </div>
          </div>

          {/* 완료된 비디오 카드 */}
          <div className="bg-background-card rounded-admin-lg p-6 border border-border-light">
            <div className="flex items-center justify-between mb-4">
              <Typography variant="h3" className="text-neutral-800">
                완료된 비디오
              </Typography>
              <div className="w-10 h-10 bg-green-100 rounded-admin flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-semibold text-neutral-900">
                  {displayData.completedVideos}
                </span>
                <span className="text-sm text-admin-success font-medium">
                  +{displayData.videosCompletedToday} 오늘
                </span>
              </div>
              <div className="text-sm text-neutral-600">
                처리 중: {displayData.videosInProgress}
              </div>
            </div>
          </div>
        </div>

        {/* 최근 활동 섹션 */}
        <div className="bg-background-card rounded-admin-lg p-6 border border-border-light mb-8">
          <div className="flex items-center justify-between mb-6">
            <Typography variant="h2" className="text-neutral-800">
              최근 활동
            </Typography>
            <Button variant="outline" size="sm">
              전체 보기
            </Button>
          </div>
          
          <div className="space-y-4">
            {displayData.recentActivities && displayData.recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start space-x-4 p-4 bg-background-secondary rounded-admin">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-primary-600">
                    {activity.type === 'project' ? 'P' : activity.type === 'user' ? 'U' : 'V'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {activity.title}
                  </p>
                  <p className="text-sm text-neutral-600 truncate">
                    {activity.description}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {activity.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 시스템 상태 */}
        <div className="bg-background-card rounded-admin-lg p-6 border border-border-light">
          <Typography variant="h2" className="text-neutral-800 mb-6">
            시스템 상태
          </Typography>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-admin-success bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-admin-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <Typography variant="h4" className="mb-1">
                API 서버
              </Typography>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-admin-success bg-opacity-10 text-admin-success">
                정상 운영 ✓
              </span>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-admin-success bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-admin-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <Typography variant="h4" className="mb-1">
                데이터베이스
              </Typography>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-admin-success bg-opacity-10 text-admin-success">
                연결됨 ✓
              </span>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-admin-success bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-admin-success" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <Typography variant="h4" className="mb-1">
                실시간 데이터
              </Typography>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-admin-success bg-opacity-10 text-admin-success">
                실시간 데이터 ✓
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}