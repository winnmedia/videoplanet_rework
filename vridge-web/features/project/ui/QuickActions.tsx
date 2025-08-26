'use client'

import { Button } from '@/shared/ui'

export function QuickActions() {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">빠른 작업</h3>
      <div className="space-y-3">
        <Button variant="outline" fullWidth>
          새 프로젝트 시작
        </Button>
        <Button variant="outline" fullWidth>
          피드백 확인
        </Button>
        <Button variant="outline" fullWidth>
          팀 멤버 초대
        </Button>
      </div>
    </div>
  )
}