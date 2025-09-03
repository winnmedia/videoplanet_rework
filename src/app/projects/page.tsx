'use client'

import React from 'react'
import Image from 'next/image'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { 
  useGetProjectsQuery,
  searchProjects,
  filterProjects,
  selectProject
} from '@/features/project-management'
import { PageLayout } from '@/widgets/PageLayout'
// LoadingSpinner는 추후 구현
import { Button } from '@/shared/ui/Button'
import { Typography } from '@/shared/ui/Typography'

export default function ProjectsPage() {
  const dispatch = useAppDispatch()
  const { searchQuery, filters } = useAppSelector(
    (state) => state.projectManagement
  )

  // RTK Query를 사용하여 프로젝트 목록 조회
  const {
    data: projectsData,
    isLoading,
    error,
    refetch
  } = useGetProjectsQuery({
    page: 1,
    limit: 20,
    search: searchQuery,
    filters
  })

  const handleSearchChange = (query: string) => {
    dispatch(searchProjects(query))
  }

  const handleFilterChange = (newFilters: Record<string, unknown>) => {
    dispatch(filterProjects(newFilters))
  }

  const handleProjectSelect = (projectId: string) => {
    dispatch(selectProject(projectId))
  }

  if (error) {
    return (
      <PageLayout title="프로젝트 - 오류">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <Typography variant="h2" className="text-red-600">
              프로젝트를 불러올 수 없습니다
            </Typography>
            <Typography variant="body" className="text-gray-600">
              네트워크 연결을 확인하고 다시 시도해주세요.
            </Typography>
            <Button onClick={() => refetch()} className="mt-4">
              다시 시도
            </Button>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="프로젝트 관리">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 섹션 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <Typography variant="h1" className="text-gray-900 mb-2">
              프로젝트 관리
            </Typography>
            <Typography variant="body" className="text-gray-600">
              팀의 모든 비디오 프로젝트를 관리하고 협업하세요
            </Typography>
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              // 프로젝트 생성 모달 열기 (추후 구현)
              console.log('프로젝트 생성')
            }}
          >
            새 프로젝트
          </Button>
        </div>

        {/* 검색 및 필터 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="프로젝트 검색..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select 
                onChange={(e) => handleFilterChange({ status: [e.target.value] })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">모든 상태</option>
                <option value="active">진행중</option>
                <option value="completed">완료</option>
                <option value="paused">일시정지</option>
                <option value="archived">보관</option>
              </select>
              <select
                onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="updated">최근 업데이트</option>
                <option value="created">생성일</option>
                <option value="name">이름순</option>
                <option value="activity">활동순</option>
              </select>
            </div>
          </div>
        </div>

        {/* 프로젝트 목록 */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projectsData?.projects?.length ? (
              projectsData.projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleProjectSelect(project.id)}
                >
                  <div className="p-6">
                    {/* 프로젝트 헤더 */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <Typography variant="h3" className="text-gray-900 mb-1">
                          {project.name}
                        </Typography>
                        <Typography variant="body2" className="text-gray-500">
                          {project.description || '설명이 없습니다'}
                        </Typography>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        project.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : project.status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : project.status === 'paused'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status === 'active' && '진행중'}
                        {project.status === 'completed' && '완료'}
                        {project.status === 'paused' && '일시정지'}
                        {project.status === 'archived' && '보관'}
                      </div>
                    </div>

                    {/* 프로젝트 메타데이터 */}
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {project.memberCount}명 참여
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {new Date(project.lastUpdated).toLocaleDateString('ko-KR')}
                      </div>
                    </div>

                    {/* 프로젝트 소유자 */}
                    <div className="flex items-center mt-4 pt-4 border-t border-gray-100">
                      <Image
                        src={project.owner.avatar || '/default-avatar.png'}
                        alt={project.owner.name}
                        width={24}
                        height={24}
                        className="rounded-full mr-2"
                        priority={false}
                        placeholder="blur"
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                      />
                      <Typography variant="body2" className="text-gray-600">
                        {project.owner.name}
                      </Typography>
                      {project.isOwner && (
                        <span className="ml-auto text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          소유자
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <svg className="mx-auto w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <Typography variant="h3" className="text-gray-900 mb-2">
                  프로젝트가 없습니다
                </Typography>
                <Typography variant="body" className="text-gray-600 mb-6">
                  첫 번째 프로젝트를 생성하여 팀과 함께 협업을 시작하세요
                </Typography>
                <Button variant="primary">
                  첫 프로젝트 만들기
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 페이지네이션 (데이터가 있을 때만) */}
        {projectsData?.pagination && projectsData.projects.length > 0 && (
          <div className="flex justify-center mt-12">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={projectsData.pagination.page === 1}
              >
                이전
              </Button>
              <span className="px-4 py-2 text-sm text-gray-600">
                {projectsData.pagination.page} / {Math.ceil(projectsData.pagination.total / projectsData.pagination.limit)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!projectsData.pagination.hasMore}
              >
                다음
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}