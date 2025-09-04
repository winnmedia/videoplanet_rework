'use client'

import { useRouter } from 'next/navigation'

import { Button } from '@/shared/ui'
import { ProjectIcon, FeedbackIcon, PlanningIcon } from '@/shared/ui/icons'

export function QuickActions() {
  const router = useRouter()
  
  const handleNewProject = () => {
    router.push('/projects/create')
  }
  
  const handleFeedback = () => {
    router.push('/feedback')
  }
  
  const handlePlanning = () => {
    router.push('/planning')
  }

  return (
    <div className="space-y-3" data-testid="quick-actions">
      <Button 
        variant="outline" 
        fullWidth
        onClick={handleNewProject}
        data-testid="quick-action-new-project"
        className="flex items-center justify-center gap-3"
      >
        <ProjectIcon size={18} aria-label="" />
        새 프로젝트 시작
      </Button>
      <Button 
        variant="outline" 
        fullWidth
        onClick={handleFeedback}
        data-testid="quick-action-feedback"
        className="flex items-center justify-center gap-3"
      >
        <FeedbackIcon size={18} aria-label="" />
        피드백 확인
      </Button>
      <Button 
        variant="outline" 
        fullWidth
        onClick={handlePlanning}
        data-testid="quick-action-planning"
        className="flex items-center justify-center gap-3"
      >
        <PlanningIcon size={18} aria-label="" />
        영상 기획
      </Button>
    </div>
  )
}