'use client'

import { useParams, useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import { fetchProjectById } from '@/features/projects'
import { TeamMemberList, InviteModal } from '@/features/projects'
import type { ProjectPermission } from '@/features/projects'
import { useAppDispatch, useAppSelector } from '@/shared/lib/redux/hooks'
import { SideBar } from '@/widgets'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const id = params?.id as string
  const [showInviteModal, setShowInviteModal] = useState(false)
  
  const { currentProject, isLoading, error } = useAppSelector(state => state.projects)
  const currentUserId = 'user-1' // TODO: Get from auth context
  
  useEffect(() => {
    if (id) {
      dispatch(fetchProjectById(id))
    }
  }, [dispatch, id])
  
  // params가 없거나 id가 없을 경우 에러 처리
  if (!id) {
    return (
      <div className="min-h-screen bg-neutral-50 flex">
        <SideBar />
        <main className="flex-1 ml-sidebar pt-20 transition-all duration-300">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-neutral-950 mb-4">잘못된 접근</h1>
              <p className="text-neutral-700">프로젝트 ID가 필요합니다.</p>
            </div>
          </div>
        </main>
      </div>
    )
  }
  
  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex">
        <SideBar />
        <main className="flex-1 ml-sidebar pt-20 transition-all duration-300">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-neutral-200 rounded w-1/3" />
              <div className="h-4 bg-neutral-200 rounded w-1/4" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-lg border border-neutral-300 p-6">
                    <div className="h-6 bg-neutral-200 rounded w-1/4 mb-4" />
                    <div className="space-y-3">
                      <div className="h-4 bg-neutral-200 rounded" />
                      <div className="h-4 bg-neutral-200 rounded w-3/4" />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="bg-white rounded-lg border border-neutral-300 p-6">
                    <div className="h-6 bg-neutral-200 rounded w-1/2 mb-4" />
                    <div className="space-y-3">
                      <div className="h-4 bg-neutral-200 rounded" />
                      <div className="h-4 bg-neutral-200 rounded w-3/4" />
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
  
  // 에러 상태
  if (error || !currentProject) {
    return (
      <div className="min-h-screen bg-neutral-50 flex">
        <SideBar />
        <main className="flex-1 ml-sidebar pt-20 transition-all duration-300">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-neutral-950 mb-4">프로젝트를 찾을 수 없습니다</h1>
              <p className="text-neutral-700">{error || '요청하신 프로젝트가 존재하지 않습니다.'}</p>
              <button
                onClick={() => router.back()}
                className="mt-4 px-4 py-2 bg-vridge-500 text-white rounded-lg hover:bg-vridge-600 transition-colors"
              >
                돌아가기
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const isOwner = currentProject.ownerId === currentUserId

  const handleInvite = async (emails: string[], permission: ProjectPermission, message?: string) => {
    // TODO: API 호출
    console.log('Inviting:', { emails, permission, message })
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  const handleUpdatePermission = (memberId: string, permission: ProjectPermission) => {
    // TODO: API 호출
    console.log('Updating permission:', { memberId, permission })
  }

  const handleRemoveMember = (memberId: string) => {
    // TODO: API 호출
    console.log('Removing member:', memberId)
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <SideBar />
      <main className="flex-1 ml-sidebar pt-20 transition-all duration-300">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Page Header */}
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-neutral-950">{currentProject.title}</h1>
              <p className="text-neutral-700 mt-2">{currentProject.description || '프로젝트 상세 정보'}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/projects/${id}/edit`)}
                className="px-4 py-2 bg-white border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                수정
              </button>
              {isOwner && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-4 py-2 bg-vridge-500 text-white rounded-lg hover:bg-vridge-600 transition-colors"
                >
                  팀원 초대
                </button>
              )}
            </div>
          </div>
          
          {/* Project Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* 프로젝트 개요 */}
              <div className="bg-white rounded-lg border border-neutral-300 p-6">
                <h2 className="text-xl font-semibold text-neutral-950 mb-4">프로젝트 개요</h2>
                <div className="space-y-4">
                  <div>
                    <span className="font-medium text-neutral-950">상태:</span>
                    <span className={`ml-2 px-2.5 py-0.5 rounded-full text-sm font-medium ${
                      currentProject.status === 'active' ? 'bg-success-100 text-success-700' :
                      currentProject.status === 'archived' ? 'bg-neutral-100 text-neutral-700' :
                      'bg-error-100 text-error-700'
                    }`}>
                      {currentProject.status === 'active' ? '진행중' : 
                       currentProject.status === 'archived' ? '보관됨' : '삭제됨'}
                    </span>
                  </div>
                  {currentProject.tags.length > 0 && (
                    <div>
                      <span className="font-medium text-neutral-950">태그:</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {currentProject.tags.map(tag => (
                          <span 
                            key={tag}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-vridge-50 text-vridge-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-neutral-950">설정:</span>
                    <ul className="mt-2 space-y-1 text-sm text-neutral-700">
                      <li>• {currentProject.settings.isPublic ? '공개' : '비공개'} 프로젝트</li>
                      <li>• 댓글 {currentProject.settings.allowComments ? '허용' : '비허용'}</li>
                      <li>• 다운로드 {currentProject.settings.allowDownloads ? '허용' : '비허용'}</li>
                      <li>• 최대 파일 크기: {Math.round(currentProject.settings.maxFileSize / 1048576)}MB</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 팀 멤버 */}
              <div className="bg-white rounded-lg border border-neutral-300 p-6">
                <h2 className="text-xl font-semibold text-neutral-950 mb-4">팀 멤버</h2>
                <TeamMemberList
                  members={currentProject.members}
                  currentUserId={currentUserId}
                  isOwner={isOwner}
                  onUpdatePermission={handleUpdatePermission}
                  onRemoveMember={handleRemoveMember}
                />
              </div>
            </div>
            
            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-neutral-300 p-6">
                <h3 className="text-lg font-semibold text-neutral-950 mb-4">프로젝트 정보</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-neutral-500">프로젝트 ID</span>
                    <p className="text-sm text-neutral-950">{currentProject.id}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-neutral-500">생성일</span>
                    <p className="text-sm text-neutral-950">
                      {new Date(currentProject.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-neutral-500">최근 업데이트</span>
                    <p className="text-sm text-neutral-950">
                      {new Date(currentProject.updatedAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-neutral-500">팀 구성원</span>
                    <p className="text-sm text-neutral-950">{currentProject.memberCount}명</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-neutral-500">소유자</span>
                    <p className="text-sm text-neutral-950">
                      {currentProject.members.find(m => m.userId === currentProject.ownerId)?.name || '알 수 없음'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 허용된 파일 형식 */}
              <div className="bg-white rounded-lg border border-neutral-300 p-6">
                <h3 className="text-lg font-semibold text-neutral-950 mb-4">허용된 파일 형식</h3>
                <div className="flex flex-wrap gap-2">
                  {currentProject.settings.allowedFileTypes.map(type => (
                    <span 
                      key={type}
                      className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-700"
                    >
                      .{type}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 초대 모달 */}
      <InviteModal
        projectId={currentProject.id}
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
      />
    </div>
  )
}