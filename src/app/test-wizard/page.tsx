'use client'

import { PlanningWizard } from '@/widgets/planning-wizard'

export default function TestWizardPage() {
  return (
    <div className="min-h-screen bg-background-secondary p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-neutral-800 mb-6">
          Planning Wizard 테스트 페이지
        </h1>
        
        <PlanningWizard 
          projectId="1"
          onCancel={() => {
            console.log('Planning Wizard cancelled')
            alert('기획 마법사가 취소되었습니다.')
          }}
        />
      </div>
    </div>
  )
}