'use client'

import { useRouter } from 'next/navigation'

import { Button } from '@/shared/ui'

export function CreateProjectButton() {
  const router = useRouter()
  
  const handleClick = () => {
    router.push('/projects/create')
  }

  return (
    <Button 
      variant="primary"
      onClick={handleClick}
      data-testid="create-project-button"
      aria-label="새 프로젝트 생성"
    >
      + 새 프로젝트
    </Button>
  )
}