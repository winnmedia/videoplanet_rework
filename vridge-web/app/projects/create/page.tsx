'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { CreateProjectForm } from '@/features/project'
import { Button, Input, Card } from '@/shared/ui'

export default function CreateProjectPage() {
  const router = useRouter()

  return (
    <main className="flex-1 ml-0 md:ml-sidebar pt-16 md:pt-0 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              aria-label="이전 페이지로 돌아가기"
              data-testid="back-button"
            >
              ← 돌아가기
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">새 프로젝트 생성</h1>
          <p className="text-gray-600 mt-2">
            새로운 비디오 프로젝트를 시작하세요. 팀원들과 함께 협업하여 완성도 높은 콘텐츠를 만들어보세요.
          </p>
        </div>

        {/* DEVPLAN.md 요구사항을 포함한 새로운 프로젝트 생성 폼 */}
        <Card className="p-6">
          <CreateProjectForm />
        </Card>

        {/* DEVPLAN.md 요구사항 - 자동 일정 시스템 안내 */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="font-medium text-blue-900 mb-2">⏰ 자동 일정 시스템</h3>
          <ul className="text-sm text-blue-800 space-y-1">
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