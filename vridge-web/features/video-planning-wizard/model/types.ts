/**
 * @fileoverview 영상 기획 위저드 타입 정의
 * @description 3단계 영상 기획 위저드의 데이터 구조와 API 인터페이스
 */

// ============================
// 기본 데이터 타입
// ============================

export type ToneManner = 
  | '잔잔' 
  | '발랄' 
  | '소름' 
  | '귀엽' 
  | '시크' 
  | '감성' 
  | '유머' 
  | '진지'

export type Genre = 
  | '드라마' 
  | '공포' 
  | 'SF' 
  | '액션' 
  | '광고' 
  | '다큐멘터리' 
  | '교육' 
  | '뮤직비디오' 
  | '예능' 
  | '뉴스'

export type Target = 
  | '10대' 
  | '20대' 
  | '30대' 
  | '40대' 
  | '50대 이상' 
  | '전 연령' 
  | '비즈니스 전문가' 
  | '일반 소비자'

export type Duration = 
  | '15초' 
  | '30초' 
  | '60초' 
  | '90초' 
  | '2분' 
  | '3분' 
  | '5분' 
  | '10분 이상'

export type Format = 
  | '인터뷰' 
  | '스토리텔링' 
  | '애니메이션' 
  | '모션그래픽' 
  | '실사 촬영' 
  | '화면 녹화' 
  | '라이브 액션' 
  | '혼합형'

export type Tempo = 
  | '빠르게' 
  | '보통' 
  | '느리게'

export type StoryStructure = 
  | '훅–몰입–반전–떡밥' 
  | '기승전결' 
  | '귀납법' 
  | '연역법' 
  | '다큐(인터뷰식)' 
  | '픽사 스토리텔링'

export type StoryIntensity = 
  | '그대로' 
  | '적당히' 
  | '풍부하게'

export type PresetType = 
  | '광고형' 
  | '드라마형' 
  | '다큐형' 
  | '소셜미디어형'

// ============================
// STEP 1: 입력/선택 단계 타입
// ============================

export interface PlanningInput {
  title: string
  logline: string
  toneManner: ToneManner
  genre: Genre
  target: Target
  duration: Duration
  format: Format
  tempo: Tempo
  storyStructure: StoryStructure
  storyIntensity: StoryIntensity
}

export interface PresetConfig {
  type: PresetType
  data: Partial<PlanningInput>
}

// ============================
// STEP 2: 4단계 검토/수정 타입
// ============================

export interface PlanningStage {
  id: string
  title: string
  content: string
  goal: string
  duration: string
  order: number
}

export interface FourStagesPlan {
  id: string
  projectTitle: string
  stages: PlanningStage[]
  totalDuration: string
  createdAt: string
  updatedAt: string
}

// ============================
// STEP 3: 12숏 편집 타입
// ============================

export type ShotType = 
  | '익스트림 롱샷' 
  | '롱샷' 
  | '미디엄샷' 
  | '클로즈업' 
  | '익스트림 클로즈업' 
  | '와이드샷' 
  | '버드아이뷰' 
  | '웜즈아이뷰'

export type CameraMove = 
  | '고정' 
  | '팬' 
  | '틸트' 
  | '줌인' 
  | '줌아웃' 
  | '트래킹' 
  | '크레인샷' 
  | '핸드헬드'

export type Composition = 
  | '정면' 
  | '측면' 
  | '비스듬' 
  | '백샷' 
  | '오버 숄더' 
  | '3분의 1 법칙' 
  | '대칭' 
  | '비대칭'

export type Transition = 
  | '컷' 
  | '디졸브' 
  | '페이드인' 
  | '페이드아웃' 
  | '와이프' 
  | '점프컷' 
  | '매치컷' 
  | '크로스컷'

export interface VideoShot {
  id: string
  order: number
  title: string
  description: string
  shotType: ShotType
  cameraMove: CameraMove
  composition: Composition
  duration: number // 초 단위
  dialogue: string
  subtitle: string
  audio: string
  transition: Transition
  storyboardUrl?: string
  notes?: string
}

export interface InsertShot {
  id: string
  purpose: string
  description: string
  framing: string
  notes?: string
  imageUrl?: string
}

export interface TwelveShotsPlan {
  id: string
  projectTitle: string
  shots: VideoShot[]
  insertShots: InsertShot[]
  totalDuration: number
  createdAt: string
  updatedAt: string
}

// ============================
// 내보내기 관련 타입
// ============================

export interface ExportOptions {
  format: 'json' | 'pdf'
  includeStoryboard: boolean
  includeInserts: boolean
  pdfLayout: 'portrait' | 'landscape'
}

export interface ExportResult {
  success: boolean
  downloadUrl?: string
  error?: string
}

// ============================
// API 요청/응답 타입
// ============================

export interface GenerateStagesRequest {
  input: PlanningInput
}

export interface GenerateStagesResponse {
  success: boolean
  stages: PlanningStage[]
  totalDuration: string
  error?: string
}

export interface GenerateShotsRequest {
  stages: PlanningStage[]
  input: PlanningInput
}

export interface GenerateShotsResponse {
  success: boolean
  shots: VideoShot[]
  insertShots: InsertShot[]
  totalDuration: number
  error?: string
}

export interface GenerateStoryboardRequest {
  shot: VideoShot
}

export interface GenerateStoryboardResponse {
  success: boolean
  storyboardUrl: string
  error?: string
}

export interface ExportPlanRequest {
  fourStagesPlan: FourStagesPlan
  twelveShotsPlan: TwelveShotsPlan
  options: ExportOptions
}

export interface ExportPlanResponse {
  success: boolean
  downloadUrl: string
  error?: string
}

// ============================
// 컴포넌트 Props 타입
// ============================

export interface VideoPlanningWizardProps {
  className?: string
  onComplete?: (result: { stages: FourStagesPlan; shots: TwelveShotsPlan }) => void
  onError?: (error: string) => void
}

export interface PlanningInputFormProps {
  onSubmit: (input: PlanningInput) => void
  onPresetSelect: (preset: PresetConfig) => void
  isLoading?: boolean
  error?: string
}

export interface FourStagesReviewProps {
  stages: PlanningStage[]
  onStageUpdate: (stageId: string, updates: Partial<PlanningStage>) => void
  onReset: () => void
  onNext: () => void
  onBack: () => void
  isLoading?: boolean
}

export interface TwelveShotsEditorProps {
  shots: VideoShot[]
  insertShots: InsertShot[]
  onShotUpdate: (shotId: string, updates: Partial<VideoShot>) => void
  onInsertUpdate: (insertId: string, updates: Partial<InsertShot>) => void
  onGenerateStoryboard: (shotId: string) => void
  onExport: (options: ExportOptions) => void
  onBack: () => void
  isLoading?: boolean
}

// ============================
// 위저드 상태 관리 타입
// ============================

export type WizardStep = 1 | 2 | 3

export interface WizardState {
  currentStep: WizardStep
  input: Partial<PlanningInput>
  stages: PlanningStage[]
  shots: VideoShot[]
  insertShots: InsertShot[]
  isLoading: boolean
  error: string | null
}

export interface WizardActions {
  setStep: (step: WizardStep) => void
  setInput: (input: Partial<PlanningInput>) => void
  setStages: (stages: PlanningStage[]) => void
  setShots: (shots: VideoShot[]) => void
  setInsertShots: (insertShots: InsertShot[]) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

// ============================
// 프리셋 구성 상수
// ============================

export const PRESETS: Record<PresetType, Partial<PlanningInput>> = {
  '광고형': {
    title: '상품 소개 영상',
    logline: '우리 제품의 놀라운 효과를 경험해보세요',
    toneManner: '발랄',
    genre: '광고',
    target: '일반 소비자',
    duration: '30초',
    format: '실사 촬영',
    tempo: '빠르게',
    storyStructure: '훅–몰입–반전–떡밥',
    storyIntensity: '풍부하게'
  },
  '드라마형': {
    title: '감동 스토리',
    logline: '평범한 일상 속 특별한 순간의 이야기',
    toneManner: '감성',
    genre: '드라마',
    target: '20대',
    duration: '90초',
    format: '스토리텔링',
    tempo: '보통',
    storyStructure: '기승전결',
    storyIntensity: '적당히'
  },
  '다큐형': {
    title: '전문가 인터뷰',
    logline: '업계 전문가가 말하는 진실',
    toneManner: '진지',
    genre: '다큐멘터리',
    target: '비즈니스 전문가',
    duration: '3분',
    format: '인터뷰',
    tempo: '느리게',
    storyStructure: '다큐(인터뷰식)',
    storyIntensity: '그대로'
  },
  '소셜미디어형': {
    title: '바이럴 콘텐츠',
    logline: '지금 가장 핫한 트렌드를 담은 영상',
    toneManner: '유머',
    genre: '예능',
    target: '10대',
    duration: '15초',
    format: '모션그래픽',
    tempo: '빠르게',
    storyStructure: '훅–몰입–반전–떡밥',
    storyIntensity: '풍부하게'
  }
}

// ============================
// 유틸리티 타입
// ============================

export type RequiredFields<T> = {
  [K in keyof T]-?: T[K]
}

export type OptionalFields<T> = {
  [K in keyof T]?: T[K]
}