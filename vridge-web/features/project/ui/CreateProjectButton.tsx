'use client'

import { Button } from '@/shared/ui'

export function CreateProjectButton() {
  const handleClick = () => {
    console.log('Create new project')
  }

  return (
    <Button 
      variant="primary"
      onClick={handleClick}
    >
      새 프로젝트
    </Button>
  )
}