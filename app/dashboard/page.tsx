'use client'

import { faCalendarDays, faVideo, faComments, faChartBar } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

// Emergency deployment - temporarily disable missing imports
// import { QuickActions } from '@/features/projects'
import { SideBar } from '@/widgets'
// import { 
//   RecentActivityFeed,
//   FeedbackSummaryCard,
//   InvitationSummaryCard,
//   ScheduleSummaryCard,
//   UnreadBadge,
//   dashboardApiClient,
//   type DashboardData
// } from '@/widgets/Dashboard'

// Temporary placeholder components
const RecentActivityFeed = () => <div className="text-gray-500">활동 피드 준비중...</div>
const FeedbackSummaryCard = () => <div className="text-gray-500">피드백 요약 준비중...</div>
const InvitationSummaryCard = () => <div className="text-gray-500">초대 요약 준비중...</div>
const ScheduleSummaryCard = () => <div className="text-gray-500">일정 요약 준비중...</div>
const UnreadBadge = ({ count }: { count: number }) => <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">{count}</span>
const QuickActions = () => <div className="text-gray-500">빠른 작업 준비중...</div>

// Mock API client
const dashboardApiClient = {
  fetchDashboardData: () => Promise.resolve({}),
  markFeedbackAsRead: (_id: string) => Promise.resolve(),
  resendInvitation: (_id: string) => Promise.resolve(),
  acceptInvitation: (_id: string) => Promise.resolve(),
}

type DashboardData = Record<string, unknown>

export default function DashboardPage() {
  const router = useRouter()
  
  // 상태 관리
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [scheduleViewType, setScheduleViewType] = useState<'week' | 'month'>('week')
  
  // 현재 시간 표시를 위한 상태
  const currentTime = new Date().toLocaleTimeString('ko-KR', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  })
  
  const currentDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })

  // 대시보드 데이터 로딩
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true)
        const data = await dashboardApiClient.fetchDashboardData()
        setDashboardData(data)
      } catch (error) {
        console.error('Dashboard data loading failed:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  // 이벤트 핸들러들 (DoD 규격: 실제 API 호출)
  const handleFeedbackItemClick = async (itemId: string) => {
    try {
      // 읽음 처리 API 호출
      await dashboardApiClient.markFeedbackAsRead(itemId)
      
      // 대시보드 데이터 갱신
      const updatedData = await dashboardApiClient.fetchDashboardData()
      setDashboardData(updatedData)
      
      // 피드백 상세 페이지로 이동
      router.push(`/feedback/${itemId}`)
    } catch (error) {
      console.error('피드백 읽음 처리 실패:', error)
      // 실패해도 페이지 이동은 진행
      router.push(`/feedback/${itemId}`)
    }
  }

  const handleMarkAllFeedbackRead = async () => {
    try {
      if (!dashboardData?.feedbackSummary?.recentItems) return
      
      // 읽지 않은 피드백들에 대해 일괄 읽음 처리
      const unreadItems = (dashboardData as Record<string, unknown>).feedbackSummary?.recentItems?.filter((item: Record<string, unknown>) => !item.isRead) || []
      
      await Promise.all(
        unreadItems.map((item: Record<string, unknown>) => dashboardApiClient.markFeedbackAsRead(item.id as string))
      )
      
      // 대시보드 데이터 갱신
      const updatedData = await dashboardApiClient.fetchDashboardData()
      setDashboardData(updatedData)
      
      console.log('모든 피드백 읽음 처리 완료')
    } catch (error) {
      console.error('모든 피드백 읽음 처리 실패:', error)
    }
  }

  const handleInvitationAction = {
    resend: async (invitationId: string) => {
      try {
        await dashboardApiClient.resendInvitation(invitationId)
        // 데이터 갱신
        const updatedData = await dashboardApiClient.fetchDashboardData()
        setDashboardData(updatedData)
      } catch (error) {
        console.error('Resend invitation failed:', error)
      }
    },
    accept: async (invitationId: string) => {
      try {
        await dashboardApiClient.acceptInvitation(invitationId)
        // 데이터 갱신
        const updatedData = await dashboardApiClient.fetchDashboardData()
        setDashboardData(updatedData)
      } catch (error) {
        console.error('Accept invitation failed:', error)
      }
    },
    decline: async (invitationId: string) => {
      // Mock: 초대 거절 API 호출
      console.log('Declining invitation:', invitationId)
      // TODO: API 구현 후 갱신
    }
  }

  const handleProjectClick = (projectId: string) => {
    router.push(`/projects/${projectId}`)
  }

  const handleViewDetails = (section: string) => {
    router.push(`/${section}`)
  }
  
  // 로딩 상태 처리
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <SideBar />
        <main className="ml-sidebar pt-20 px-8 pb-8">
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-vridge-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">대시보드를 불러오는 중...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 사이드바 */}
      <SideBar />
      
      {/* 메인 콘텐츠 - DEVPLAN.md 요구사항에 따른 새로운 레이아웃 */}
      <main className="ml-sidebar pt-20 px-8 pb-8">
        <div className="min-h-screen">
          {/* 헤더 */}
          <header className="mb-12">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-black tracking-wide">
                  {currentTime}
                  <small className="block font-normal mt-1 text-base text-black/40">
                    {currentDate}
                  </small>
                </h1>
              </div>
              
              {/* 전체 읽지 않음 배지 */}
              {dashboardData?.unreadStats && dashboardData.unreadStats.totalUnread > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">읽지 않음</span>
                  <UnreadBadge 
                    count={dashboardData.unreadStats.totalUnread}
                    priority="high"
                    size="lg"
                  />
                </div>
              )}
            </div>
          </header>

          {/* 핵심 기능 위젯들 - 일관된 그리드 레이아웃 */}
          <section className="mb-12">
            {/* 상단: 피드백 및 초대 카드 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* 새 피드백 요약 */}
              {dashboardData?.feedbackSummary && (
                <div className="min-h-[320px]">
                  <FeedbackSummaryCard
                    data={dashboardData.feedbackSummary}
                    onViewDetails={() => handleViewDetails('feedback')}
                    onMarkAllRead={handleMarkAllFeedbackRead}
                    onItemClick={handleFeedbackItemClick}
                  />
                </div>
              )}

              {/* 초대 관리 요약 */}
              {dashboardData?.invitationStats && (
                <div className="min-h-[320px]">
                  <InvitationSummaryCard
                    data={dashboardData.invitationStats}
                    onViewDetails={() => handleViewDetails('invitations')}
                    onResendInvitation={handleInvitationAction.resend}
                    onAcceptInvitation={handleInvitationAction.accept}
                    onDeclineInvitation={handleInvitationAction.decline}
                    onItemClick={(id: string) => console.log('Invitation clicked:', id)}
                  />
                </div>
              )}
            </div>

            {/* 하단: 편집 일정 간트 요약 - 전체 너비 */}
            {dashboardData?.scheduleStats && (
              <div className="w-full">
                <ScheduleSummaryCard
                  data={dashboardData.scheduleStats}
                  viewType={scheduleViewType}
                  onViewTypeChange={setScheduleViewType}
                  onProjectClick={handleProjectClick}
                  onViewDetails={() => handleViewDetails('schedule')}
                  onCreateProject={() => router.push('/projects/create')}
                />
              </div>
            )}
          </section>

          {/* 빠른 네비게이션 - FontAwesome 아이콘으로 표준화 */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">빠른 이동</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {/* 캘린더 */}
              <button 
                type="button"
                className="group flex flex-col items-center transition-all duration-300 hover:transform hover:scale-105"
                onClick={() => router.push('/calendar')}
                aria-label="캘린더 페이지로 이동"
              >
                <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-vridge-500 shadow-sm">
                  <FontAwesomeIcon icon={faCalendarDays} className="w-8 h-8 text-white" />
                </div>
                <span className="mt-3 text-sm font-medium text-gray-700 group-hover:text-vridge-600 transition-colors">
                  캘린더
                </span>
              </button>

              {/* 프로젝트 */}
              <button 
                type="button"
                className="group flex flex-col items-center transition-all duration-300 hover:transform hover:scale-105"
                onClick={() => router.push('/projects')}
                aria-label="프로젝트 페이지로 이동"
              >
                <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-primary-500 shadow-sm">
                  <FontAwesomeIcon icon={faChartBar} className="w-8 h-8 text-white" />
                </div>
                <span className="mt-3 text-sm font-medium text-gray-700 group-hover:text-primary-600 transition-colors">
                  프로젝트
                </span>
              </button>

              {/* 피드백 */}
              <button 
                type="button"
                className="group flex flex-col items-center transition-all duration-300 hover:transform hover:scale-105 relative"
                onClick={() => router.push('/feedback')}
                aria-label="피드백 페이지로 이동"
              >
                <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-warning-500 shadow-sm">
                  <FontAwesomeIcon icon={faComments} className="w-8 h-8 text-white" />
                </div>
                {/* 피드백 배지 */}
                {dashboardData?.feedbackSummary?.totalUnread && dashboardData.feedbackSummary.totalUnread > 0 && (
                  <div className="absolute -top-1 -right-1">
                    <UnreadBadge 
                      count={dashboardData.feedbackSummary.totalUnread}
                      priority="high"
                      size="sm"
                    />
                  </div>
                )}
                <span className="mt-3 text-sm font-medium text-gray-700 group-hover:text-warning-600 transition-colors">
                  피드백
                </span>
              </button>

              {/* 영상 기획 */}
              <button 
                type="button"
                className="group flex flex-col items-center transition-all duration-300 hover:transform hover:scale-105"
                onClick={() => router.push('/planning')}
                aria-label="영상 기획 페이지로 이동"
              >
                <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-success-500 shadow-sm">
                  <FontAwesomeIcon icon={faVideo} className="w-8 h-8 text-white" />
                </div>
                <span className="mt-3 text-sm font-medium text-gray-700 group-hover:text-success-600 transition-colors">
                  영상 기획
                </span>
              </button>
            </div>
          </section>

          {/* 프로젝트 현황 통계 - 개선된 레이아웃 */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">프로젝트 현황</h2>
              <button 
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-vridge-600 hover:text-vridge-700 bg-vridge-50 hover:bg-vridge-100 rounded-lg transition-all duration-200"
                onClick={() => handleViewDetails('projects')}
                aria-label="프로젝트 전체보기"
              >
                전체보기
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 전체 프로젝트 */}
              <div className="relative overflow-hidden cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg bg-vridge-500 rounded-xl h-24 shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                <div className="relative h-full flex items-center justify-between px-4 text-white">
                  <div className="flex flex-col">
                    <div className="text-xs font-medium opacity-90 mb-1">전체</div>
                    <div className="font-bold text-2xl">{dashboardData?.stats.totalProjects || 0}</div>
                  </div>
                  <div className="text-white/20">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 진행중 프로젝트 */}
              <div className="relative overflow-hidden cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg bg-primary-500 rounded-xl h-24 shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                <div className="relative h-full flex items-center justify-between px-4 text-white">
                  <div className="flex flex-col">
                    <div className="text-xs font-medium opacity-90 mb-1">진행중</div>
                    <div className="font-bold text-2xl">{dashboardData?.stats.activeProjects || 0}</div>
                  </div>
                  <div className="text-white/20">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 완료 프로젝트 */}
              <div className="relative overflow-hidden cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg bg-success-500 rounded-xl h-24 shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                <div className="relative h-full flex items-center justify-between px-4 text-white">
                  <div className="flex flex-col">
                    <div className="text-xs font-medium opacity-90 mb-1">완료</div>
                    <div className="font-bold text-2xl">{dashboardData?.stats.completedProjects || 0}</div>
                  </div>
                  <div className="text-white/20">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 팀 멤버 */}
              <div className="relative overflow-hidden cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg bg-warning-500 rounded-xl h-24 shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                <div className="relative h-full flex items-center justify-between px-4 text-white">
                  <div className="flex flex-col">
                    <div className="text-xs font-medium opacity-90 mb-1">팀 멤버</div>
                    <div className="font-bold text-2xl">{dashboardData?.stats.totalTeamMembers || 0}</div>
                  </div>
                  <div className="text-white/20">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 최근 활동 및 빠른 작업 - 개선된 레이아웃 */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* 최근 활동 - 2/3 영역 */}
            <div className="xl:col-span-2">
              <div className="p-6 bg-white border border-gray-100 rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">최근 활동</h2>
                  <button 
                    className="flex items-center gap-1 text-sm font-medium text-vridge-600 hover:text-vridge-700 transition-colors"
                    onClick={() => handleViewDetails('activity')}
                  >
                    전체보기
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-3">
                  <RecentActivityFeed activities={dashboardData?.recentActivity || []} />
                  
                  {/* 빈 상태일 때 */}
                  {(!dashboardData?.recentActivity || dashboardData.recentActivity.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="w-12 h-12 mx-auto mb-3 text-gray-300">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium mb-1">최근 활동이 없습니다</p>
                      <p className="text-xs text-gray-400">프로젝트를 생성하거나 작업을 시작해보세요</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 빠른 작업 - 1/3 영역 */}
            <div className="xl:col-span-1">
              <div className="p-6 bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-xl shadow-sm">
                <h2 className="text-xl font-semibold mb-6 text-gray-900">빠른 작업</h2>
                <div className="space-y-4">
                  <QuickActions />
                  
                  {/* 추가 빠른 작업 버튼들 */}
                  <div className="space-y-3 mt-6">
                    <button 
                      className="w-full p-3 text-left bg-white border border-gray-200 rounded-lg hover:border-vridge-300 hover:bg-vridge-50/30 transition-all duration-200 group"
                      onClick={() => router.push('/projects/create')}
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-vridge-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-vridge-200 transition-colors">
                          <svg className="w-4 h-4 text-vridge-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">새 프로젝트</div>
                          <div className="text-xs text-gray-500">빈 프로젝트 생성</div>
                        </div>
                      </div>
                    </button>
                    
                    <button 
                      className="w-full p-3 text-left bg-white border border-gray-200 rounded-lg hover:border-success-300 hover:bg-success-50/30 transition-all duration-200 group"
                      onClick={() => router.push('/calendar')}
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-success-200 transition-colors">
                          <svg className="w-4 h-4 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">일정 추가</div>
                          <div className="text-xs text-gray-500">새로운 일정 생성</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}