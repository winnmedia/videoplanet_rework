// Planning Wizard API Functions
// 임시 구현 - 실제 AI 서비스와 연동 예정

export interface GenerateStoryRequest {
  projectId: string
  outline: string
  genre: string
  targetLength: string
}

export interface StoryResponse {
  story: string
  themes: string[]
  characters: string[]
}

export interface Generate4ActRequest {
  projectId: string
  story: string
  themes: string[]
  characters: string[]
}

export interface ActData {
  title: string
  description: string
  duration: string
}

export interface Act4Response {
  act1: ActData
  act2: ActData
  act3: ActData
  act4: ActData
}

export interface Generate12ShotRequest {
  projectId: string
  story: string
  acts: Act4Response
}

export interface ShotData {
  shotNumber: number
  type: string
  description: string
  duration: string
  location: string
  notes: string
}

export interface Shot12Response {
  shots: ShotData[]
}

export interface ExportPlanRequest {
  projectId: string
  story: string
  acts: Act4Response
  shots: Shot12Response
}

export interface ExportPlanResponse {
  url: string
  fileName: string
}

// 임시 API 함수들 - MSW에서 모킹될 예정
export async function generateStory(request: GenerateStoryRequest): Promise<StoryResponse> {
  // 실제 구현에서는 AI 서비스 호출
  throw new Error('API not implemented - should be mocked in tests')
}

export async function generate4Act(request: Generate4ActRequest): Promise<Act4Response> {
  // 실제 구현에서는 AI 서비스 호출
  throw new Error('API not implemented - should be mocked in tests')
}

export async function generate12Shot(request: Generate12ShotRequest): Promise<Shot12Response> {
  // 실제 구현에서는 AI 서비스 호출
  throw new Error('API not implemented - should be mocked in tests')
}

export async function exportPlanToPDF(request: ExportPlanRequest): Promise<ExportPlanResponse> {
  // 실제 구현에서는 PDF 생성 서비스 호출
  throw new Error('API not implemented - should be mocked in tests')
}