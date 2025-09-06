'use client'

import { useRouter } from 'next/navigation'
import React from 'react'

import { CreateProjectForm } from '@/features/projects'

export default function CreateProjectPage() {
  const router = useRouter()

  const handleCancel = () => {
    router.back()
  }

  const handleSuccess = (projectId: string) => {
    router.push(`/projects/${projectId}`)
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-neutral-700 hover:text-neutral-950 transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>돌아가기</span>
          </button>
          <h1 className="text-3xl font-bold text-neutral-950">새 프로젝트 생성</h1>
          <p className="text-neutral-700 mt-2">
            새로운 비디오 프로젝트를 시작하세요. 팀원들과 함께 협업하여 완성도 높은 콘텐츠를 만들어보세요.
          </p>
        </div>

        {/* 프로젝트 생성 폼 */}
        <div className="bg-white rounded-lg border border-neutral-300 p-8">
          <CreateProjectForm 
            onCancel={handleCancel}
            onSuccess={handleSuccess}
          />
        </div>

        {/* 자동 일정 시스템 안내 */}
        <div className="mt-8 p-4 bg-vridge-50 border border-vridge-200 rounded-lg">
          <h3 className="font-medium text-vridge-900 mb-2">자동 일정 시스템</h3>
          <ul className="text-sm text-vridge-800 space-y-1">
            <li>• 기본 일정: 기획 1주 → 촬영 1일 → 편집 2주로 자동 설정됩니다</li>
            <li>• 시작 날짜를 변경하면 전체 일정이 자동으로 재계산됩니다</li>
            <li>• 수동 설정 모드로 전환하여 각 단계별 기간을 커스터마이징할 수 있어요</li>
            <li>• 생성된 프로젝트는 자동으로 캘린더에 등록되어 팀원들과 공유됩니다</li>
          </ul>
        </div>
      </div>
    </main>
  )
}