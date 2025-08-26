'use client'

import { useState } from 'react'
import { Select } from '@/shared/ui'

export function ProjectFilter() {
  const [status, setStatus] = useState('all')
  
  return (
    <div className="flex gap-4">
      <Select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        options={[
          { value: 'all', label: '전체' },
          { value: 'active', label: '진행중' },
          { value: 'completed', label: '완료' },
          { value: 'pending', label: '대기' }
        ]}
      />
    </div>
  )
}