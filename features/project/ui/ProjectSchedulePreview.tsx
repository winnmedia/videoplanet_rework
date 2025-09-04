'use client'

interface ScheduleStep {
  duration: number
  label: string
}

interface ProjectSchedule {
  planning: ScheduleStep
  filming: ScheduleStep
  editing: ScheduleStep
}

interface ProjectSchedulePreviewProps {
  schedule: ProjectSchedule
}

/**
 * 프로젝트 자동 일정 프리뷰 컴포넌트
 * 기획, 촬영, 편집 단계별 일정을 바 형태로 시각화
 */
export function ProjectSchedulePreview({ schedule }: ProjectSchedulePreviewProps) {
  const totalDuration = schedule.planning.duration + schedule.filming.duration + schedule.editing.duration

  // 각 단계별 비율 계산
  const planningRatio = (schedule.planning.duration / totalDuration) * 100
  const filmingRatio = (schedule.filming.duration / totalDuration) * 100
  const editingRatio = (schedule.editing.duration / totalDuration) * 100

  return (
    <div className="bg-white p-4 border border-gray-200 rounded-lg">
      <h3 className="text-sm font-medium text-gray-900 mb-3">자동 일정 프리뷰</h3>
      
      {/* 일정 바 */}
      <div className="mb-4">
        <div className="flex rounded-lg overflow-hidden h-8 bg-gray-100">
          {/* 기획 단계 */}
          <div 
            className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
            style={{ width: `${planningRatio}%` }}
            data-testid="planning-bar"
          >
            {planningRatio > 15 ? schedule.planning.label : ''}
          </div>
          
          {/* 촬영 단계 */}
          <div 
            className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
            style={{ width: `${filmingRatio}%` }}
            data-testid="filming-bar"
          >
            {filmingRatio > 15 ? schedule.filming.label : ''}
          </div>
          
          {/* 편집 단계 */}
          <div 
            className="bg-purple-500 flex items-center justify-center text-white text-xs font-medium"
            style={{ width: `${editingRatio}%` }}
            data-testid="editing-bar"
          >
            {editingRatio > 15 ? schedule.editing.label : ''}
          </div>
        </div>
      </div>

      {/* 단계별 상세 정보 */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
          <span className="text-gray-600">{schedule.planning.label}</span>
        </div>
        <div className="flex items-center text-sm">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span className="text-gray-600">{schedule.filming.label}</span>
        </div>
        <div className="flex items-center text-sm">
          <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
          <span className="text-gray-600">{schedule.editing.label}</span>
        </div>
      </div>

      {/* 총 기간 */}
      <div className="pt-2 border-t border-gray-100">
        <p className="text-sm font-medium text-gray-900">
          총 프로젝트 기간: {totalDuration}일
        </p>
      </div>
    </div>
  )
}