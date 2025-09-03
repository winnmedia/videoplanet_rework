// 프로젝트 생성 및 팀 관리 API

interface ProjectCreateData {
  name: string
  description: string
  category: string
  budget: number
  deadline: string
  autoSchedule: {
    planningDays: number
    shootingDays: number
    editingDays: number
  }
}

interface ProjectResponse {
  id: string
  name: string
  description: string
  category: string
  budget: number
  deadline: string
  schedule: Array<{
    phase: string
    startDate: string
    endDate: string
    duration: number
  }>
  createdAt: string
  updatedAt: string
}

// 팀 초대 관련 타입
interface TeamInviteData {
  projectId: string
  email: string
  role: 'owner' | 'admin' | 'editor' | 'reviewer' | 'viewer'
  message?: string
}

interface TeamInviteResponse {
  status: 'sent' | 'failed'
  messageId: string
  recipientEmail: string
}

// Mock 구현 (실제 구현에서는 axios 사용)
export const createProject = async (data: ProjectCreateData): Promise<ProjectResponse> => {
  // 실제 환경에서는 axios나 fetch를 사용
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // 테스트 에러 시나리오를 위한 조건
      if (data.name === 'ERROR_TEST') {
        reject(new Error('Network error'))
        return
      }

      // 자동 스케줄 계산 (마감일 기준)
      const deadline = new Date(data.deadline)
      const totalDays = data.autoSchedule.planningDays + data.autoSchedule.shootingDays + data.autoSchedule.editingDays
      const startDate = new Date(deadline)
      startDate.setDate(deadline.getDate() - totalDays)

      // 스케줄 생성
      const schedule = []
      const currentDate = new Date(startDate)

      // 기획 단계
      const planningEnd = new Date(currentDate)
      planningEnd.setDate(currentDate.getDate() + data.autoSchedule.planningDays - 1)
      schedule.push({
        phase: 'planning',
        startDate: currentDate.toISOString().split('T')[0],
        endDate: planningEnd.toISOString().split('T')[0],
        duration: data.autoSchedule.planningDays
      })

      // 촬영 단계
      currentDate.setDate(planningEnd.getDate() + 1)
      const shootingEnd = new Date(currentDate)
      shootingEnd.setDate(currentDate.getDate() + data.autoSchedule.shootingDays - 1)
      schedule.push({
        phase: 'shooting',
        startDate: currentDate.toISOString().split('T')[0],
        endDate: shootingEnd.toISOString().split('T')[0],
        duration: data.autoSchedule.shootingDays
      })

      // 편집 단계
      currentDate.setDate(shootingEnd.getDate() + 1)
      const editingEnd = new Date(currentDate)
      editingEnd.setDate(currentDate.getDate() + data.autoSchedule.editingDays - 1)
      schedule.push({
        phase: 'editing',
        startDate: currentDate.toISOString().split('T')[0],
        endDate: editingEnd.toISOString().split('T')[0],
        duration: data.autoSchedule.editingDays
      })

      resolve({
        id: Math.random().toString(36).substring(2, 15),
        name: data.name,
        description: data.description,
        category: data.category,
        budget: data.budget,
        deadline: data.deadline,
        schedule,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    }, 100)
  })
}

// SendGrid를 통한 팀 초대 이메일 전송
export const sendTeamInvite = async (data: TeamInviteData): Promise<TeamInviteResponse> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // 테스트 에러 시나리오
      if (data.email === 'error@test.com') {
        reject(new Error('SendGrid API Error'))
        return
      }
      
      // 중복 초대 시나리오
      if (data.email === 'existing@example.com') {
        reject(new Error('User already invited'))
        return
      }

      // 성공 응답
      resolve({
        status: 'sent',
        messageId: `msg_${Math.random().toString(36).substring(2, 15)}`,
        recipientEmail: data.email
      })
    }, 100)
  })
}