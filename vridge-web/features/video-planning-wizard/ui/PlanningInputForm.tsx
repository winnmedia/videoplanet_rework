/**
 * @fileoverview STEP 1: 입력/선택 폼 컴포넌트
 * @description 영상 기획을 위한 기본 정보 입력 및 프리셋 선택
 */

'use client'

import { useState, useCallback } from 'react'

import { cn } from '@/shared/lib/utils'
import { Button, Card, Input, Select } from '@/shared/ui/index.modern'

import type { 
  PlanningInputFormProps, 
  PlanningInput, 
  PresetConfig,
  ToneManner,
  Genre,
  Target,
  Duration,
  Format,
  Tempo,
  StoryStructure,
  StoryIntensity,
  PresetType,
  VisualStyle,
  CameraWork
} from '../model/types'
import { PRESETS } from '../model/types'

const TONE_MANNER_OPTIONS: ToneManner[] = [
  '잔잔', '발랄', '소름', '귀엽', '시크', '감성', '유머', '진지',
  '웅장', '몽환', '역동', '차분', '열정', '신비', '따뜻', '차가움',
  '빈티지', '미래지향', '럭셔리', '미니멀'
]

const GENRE_OPTIONS: Genre[] = [
  '드라마', '공포', 'SF', '액션', '광고', '다큐멘터리', '교육', '뮤직비디오', '예능', '뉴스',
  '로맨스', '코미디', '판타지', '스릴러', '미스터리', '애니메이션', '전기', '역사',
  '음식', '여행', '스포츠', '패션', '라이프스타일', '게임', '뷰티'
]

const TARGET_OPTIONS: Target[] = [
  '10대', '20대', '30대', '40대', '50대 이상', '전 연령', '비즈니스 전문가', '일반 소비자',
  '학생', '직장인', '주부', '시니어', '창업가', '아티스트', '개발자', '마케터',
  '디자이너', '투자자', '의료진', '교육자'
]

const DURATION_OPTIONS: Duration[] = [
  '15초', '30초', '60초', '90초', '2분', '3분', '5분', '10분 이상'
]

const FORMAT_OPTIONS: Format[] = [
  '인터뷰', '스토리텔링', '애니메이션', '모션그래픽', '실사 촬영', '화면 녹화', '라이브 액션', '혼합형'
]

const TEMPO_OPTIONS: Tempo[] = [
  '빠르게', '보통', '느리게'
]

const STORY_STRUCTURE_OPTIONS: { value: StoryStructure; label: string }[] = [
  { value: '훅–몰입–반전–떡밥', label: '훅–몰입–반전–떡밥' },
  { value: '기승전결', label: '기승전결' },
  { value: '귀납법', label: '귀납법' },
  { value: '연역법', label: '연역법' },
  { value: '다큐(인터뷰식)', label: '다큐(인터뷰식)' },
  { value: '픽사 스토리텔링', label: '픽사 스토리텔링' }
]

const STORY_INTENSITY_OPTIONS: { value: StoryIntensity; label: string }[] = [
  { value: '그대로', label: '그대로' },
  { value: '적당히', label: '적당히' },
  { value: '풍부하게', label: '풍부하게' }
]

// 신규 카테고리 옵션
const VISUAL_STYLE_OPTIONS: VisualStyle[] = [
  '시네마틱', '다큐멘터리', '뮤직비디오', '애니메이션', '인포그래픽',
  '스케치', '일러스트', '픽셀아트', '3D렌더링', '콜라주',
  '빈티지', '미니멀', '네온', '파스텔', '모노크롬'
]

const CAMERA_WORK_OPTIONS: CameraWork[] = [
  '고정샷', '패닝', '틸팅', '줌인', '줌아웃', '돌리인', '돌리아웃',
  '트래킹샷', '크레인샷', '핸드헬드', '스테디캠', '드론샷',
  '360도회전', '오비탈', '슬라이더'
]

const PRESET_BUTTONS: { type: PresetType; label: string; description: string }[] = [
  { type: '광고형', label: '광고형 프리셋', description: '제품/서비스 홍보용 영상' },
  { type: '드라마형', label: '드라마형 프리셋', description: '감동적인 스토리텔링 영상' },
  { type: '다큐형', label: '다큐형 프리셋', description: '전문적인 정보 전달 영상' },
  { type: '소셜미디어형', label: '소셜미디어 프리셋', description: '바이럴 콘텐츠용 영상' }
]

export const PlanningInputForm = ({
  onSubmit,
  onSubmitWithAI,
  onPresetSelect,
  isLoading = false,
  error
}: PlanningInputFormProps) => {
  const [formData, setFormData] = useState<Partial<PlanningInput>>({
    title: '',
    logline: '',
    toneManner: '발랄',
    genre: '광고',
    target: '일반 소비자',
    duration: '30초',
    format: '실사 촬영',
    tempo: '보통',
    storyStructure: '기승전결',
    // 신규 필드 초기값
    visualStyle: '시네마틱',
    cameraWork: '고정샷',
    keywords: [],
    mood: '',
    colorScheme: '',
    storyIntensity: '적당히'
  })

  // 필수 필드 검증
  const isFormValid = formData.title && formData.logline

  // 폼 데이터 업데이트
  const handleFieldChange = useCallback(<K extends keyof PlanningInput>(
    field: K,
    value: PlanningInput[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }, [])

  // 프리셋 선택 핸들러
  const handlePresetSelect = useCallback((presetType: PresetType) => {
    const preset = PRESETS[presetType]
    setFormData(prev => ({
      ...prev,
      ...preset
    }))
    
    onPresetSelect({
      type: presetType,
      data: preset
    })
  }, [onPresetSelect])

  // 폼 제출 핸들러 (일반 생성)
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isFormValid) return
    
    onSubmit(formData as PlanningInput)
  }, [formData, isFormValid, onSubmit])

  // AI 생성 핸들러
  const handleSubmitWithAI = useCallback(() => {
    if (!isFormValid) return
    
    onSubmitWithAI?.(formData as PlanningInput)
  }, [formData, isFormValid, onSubmitWithAI])

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          STEP 1: 입력/선택
        </h2>
        <p className="text-gray-600">
          영상 기획을 위한 기본 정보를 입력하고 원하는 스타일을 선택하세요
        </p>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-700">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 기본 정보 섹션 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Input
                label="제목"
                value={formData.title || ''}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder="영상 제목을 입력하세요"
                required
                aria-required="true"
                disabled={isLoading}
                className="w-full"
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="한 줄 스토리(로그라인)"
                value={formData.logline || ''}
                onChange={(e) => handleFieldChange('logline', e.target.value)}
                placeholder="핵심 메시지를 한 문장으로 표현해주세요"
                required
                aria-required="true"
                disabled={isLoading}
                className="w-full"
              />
            </div>
          </div>
        </Card>

        {/* 스타일 설정 섹션 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">스타일 설정</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <Select
                label="톤앤매너"
                value={formData.toneManner}
                onValueChange={(value) => handleFieldChange('toneManner', value as ToneManner)}
                disabled={isLoading}
                options={TONE_MANNER_OPTIONS.map(option => ({
                  value: option,
                  label: option
                }))}
              />
            </div>
            <div>
              <Select
                label="장르"
                value={formData.genre}
                onValueChange={(value) => handleFieldChange('genre', value as Genre)}
                disabled={isLoading}
                options={GENRE_OPTIONS.map(option => ({
                  value: option,
                  label: option
                }))}
              />
            </div>
            <div>
              <Select
                label="타겟"
                value={formData.target}
                onValueChange={(value) => handleFieldChange('target', value as Target)}
                disabled={isLoading}
                options={TARGET_OPTIONS.map(option => ({
                  value: option,
                  label: option
                }))}
              />
            </div>
            <div>
              <Select
                label="분량"
                value={formData.duration}
                onValueChange={(value) => handleFieldChange('duration', value as Duration)}
                disabled={isLoading}
                options={DURATION_OPTIONS.map(option => ({
                  value: option,
                  label: option
                }))}
              />
            </div>
            <div>
              <Select
                label="포맷"
                value={formData.format}
                onValueChange={(value) => handleFieldChange('format', value as Format)}
                disabled={isLoading}
                options={FORMAT_OPTIONS.map(option => ({
                  value: option,
                  label: option
                }))}
              />
            </div>
            <div>
              <Select
                label="템포"
                value={formData.tempo}
                onValueChange={(value) => handleFieldChange('tempo', value as Tempo)}
                disabled={isLoading}
                options={TEMPO_OPTIONS.map(option => ({
                  value: option,
                  label: option
                }))}
              />
            </div>
          </div>
        </Card>

        {/* 전개 방식 섹션 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">전개 방식</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                스토리 구조
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {STORY_STRUCTURE_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleFieldChange('storyStructure', value)}
                    disabled={isLoading}
                    className={cn(
                      'px-4 py-2 text-sm font-medium rounded-lg border transition-colors',
                      formData.storyStructure === value
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
                      isLoading && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                전개 강도
              </label>
              <div className="flex gap-3">
                {STORY_INTENSITY_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleFieldChange('storyIntensity', value)}
                    disabled={isLoading}
                    className={cn(
                      'px-4 py-2 text-sm font-medium rounded-lg border transition-colors',
                      formData.storyIntensity === value
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
                      isLoading && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* 프리셋 섹션 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">빠른 설정</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PRESET_BUTTONS.map(({ type, label, description }) => (
              <button
                key={type}
                type="button"
                onClick={() => handlePresetSelect(type)}
                disabled={isLoading}
                className={cn(
                  'p-4 text-left border rounded-lg transition-colors hover:bg-gray-50',
                  'border-gray-300 bg-white text-gray-700',
                  isLoading && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="font-medium text-gray-900 mb-1">{label}</div>
                <div className="text-sm text-gray-600">{description}</div>
              </button>
            ))}
          </div>
        </Card>

        {/* 제출 버튼 */}
        <div className="space-y-6">
          {/* AI 생성 섹션 (신규) */}
          {onSubmitWithAI && (
            <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">AI로 스마트하게 생성</h4>
                  <p className="text-sm text-gray-600">
                    Gemini AI가 장르별 최적화된 4단계 스토리 구조를 자동으로 생성합니다
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleSubmitWithAI}
                  disabled={!isFormValid || isLoading}
                  size="lg"
                  className="min-w-40 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>AI 생성 중...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      <span>AI로 생성</span>
                    </div>
                  )}
                </Button>
              </div>
            </Card>
          )}

          {/* 구분선 */}
          {onSubmitWithAI && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">또는</span>
              </div>
            </div>
          )}

          {/* 기존 생성 버튼 */}
          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={!isFormValid || isLoading}
              size="lg"
              className="min-w-32"
              variant={onSubmitWithAI ? "outline" : "default"}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  <span>생성 중...</span>
                </div>
              ) : (
                '일반 생성'
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* 로딩 메시지 */}
      {isLoading && (
        <div className="text-center text-gray-600">
          <div className="text-sm">4단계 기획안을 생성하고 있습니다...</div>
          <div className="text-xs text-gray-500 mt-1">
            잠시만 기다려주세요. AI가 최적의 구성을 만들고 있습니다.
          </div>
        </div>
      )}
    </div>
  )
}