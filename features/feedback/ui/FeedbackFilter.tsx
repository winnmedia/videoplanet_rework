'use client'

import { Select } from '@/shared/ui'

export function FeedbackFilter() {
  return (
    <div className="flex gap-4 items-center">
      <Select
        label="프로젝트"
        options={[
          { value: 'all', label: '모든 프로젝트' },
          { value: 'video1', label: '회사 소개 영상' },
          { value: 'video2', label: '제품 홍보 비디오' }
        ]}
      />
      <Select
        label="상태"
        options={[
          { value: 'all', label: '전체' },
          { value: 'resolved', label: '해결됨' },
          { value: 'pending', label: '대기중' }
        ]}
      />
    </div>
  )
}