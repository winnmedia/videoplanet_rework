export interface ProjectFormData {
  title: string
  description: string
  planningDuration?: number
  shootingDuration?: number
  editingDuration?: number
}

export interface SchedulePhase {
  duration: number
  startDate?: string
  endDate?: string
}

export interface SchedulePreview {
  planning: SchedulePhase
  shooting: SchedulePhase
  editing: SchedulePhase
}

export interface ProjectFormProps {
  onSubmit: (data: ProjectFormData) => void | Promise<void>
  isLoading?: boolean
}