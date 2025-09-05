/**
 * Story Structure Prompt Templates
 * @description 6가지 스토리 구조별 프롬프트 템플릿 엔지니어링
 * @layer shared/lib
 */

import type { PlanningInput, StoryStructure } from '@/features/video-planning-wizard/model/types'

// ===========================
// Story Structure Templates
// ===========================

/**
 * 훅-몰입-반전-떡밥 구조 (바이럴)
 * 첫 3초로 시청자를 낚고, 몰입시키고, 반전으로 놀라게 하고, 떡밥으로 재시청 유도
 */
function createHookImmersionTwistBaitPrompt(input: PlanningInput): string {
  return `
영상 기획: ${input.title}
로그라인: ${input.logline}
장르: ${input.genre} | 타겟: ${input.target} | 분위기: ${input.toneManner}
구조: 훅-몰입-반전-떡밥 (바이럴 최적화)

다음과 같은 4단계 구조로 ${input.duration} 영상을 기획해주세요:

1. 훅(Hook) - 첫 3-5초
   - 시청자를 즉시 사로잡을 충격적/흥미로운 장면
   - 스크롤을 멈추게 하는 강력한 비주얼 또는 대사
   - "${input.target}" 타겟이 반응할 만한 트리거 요소 포함

2. 몰입(Immersion) - 중반부
   - 훅에서 제시한 상황의 배경 설명
   - 시청자가 감정적으로 몰입할 수 있는 스토리 전개
   - "${input.toneManner}" 톤앤매너로 분위기 형성

3. 반전(Twist) - 클라이막스
   - 예상을 뒤집는 놀라운 반전 포인트
   - 시청자가 "와!"하며 놀랄 만한 요소
   - 브랜드/메시지와 자연스럽게 연결되는 포인트

4. 떡밥(Teaser) - 마무리
   - 재시청을 유도하는 숨겨진 디테일 언급
   - 다음 에피소드 또는 관련 콘텐츠 예고
   - 댓글과 공유를 유도하는 질문 또는 화제 제시

각 단계별로 구체적인 장면 설명과 예상 소요 시간을 제시해주세요.
키워드를 직접 언급하지 말고 자연스럽게 스토리에 녹여주세요.
`
}

/**
 * 기승전결 구조 (클래식)
 * 전통적이고 안정적인 스토리텔링 구조
 */
function createClassicStructurePrompt(input: PlanningInput): string {
  return `
영상 기획: ${input.title}
로그라인: ${input.logline}
장르: ${input.genre} | 타겟: ${input.target} | 분위기: ${input.toneManner}
구조: 기승전결 (클래식 스토리텔링)

다음과 같은 4단계 기승전결 구조로 ${input.duration} 영상을 기획해주세요:

1. 기(起) - 도입부
   - 상황과 등장인물/요소 소개
   - 시청자가 이해할 수 있는 배경 설정
   - "${input.target}" 타겟이 공감할 수 있는 일상적 상황

2. 승(承) - 전개부
   - 갈등이나 문제 상황 발생
   - 긴장감을 서서히 높여가는 과정
   - "${input.toneManner}" 분위기로 감정 몰입 유도

3. 전(轉) - 절정부
   - 갈등이 최고조에 달하는 순간
   - 가장 극적이고 임팩트 있는 장면
   - 핵심 메시지가 드러나는 결정적 순간

4. 결(結) - 마무리
   - 갈등의 해결과 결말
   - 시청자에게 전달하고자 하는 교훈이나 메시지
   - 만족감과 여운을 남기는 엔딩

각 단계별로 자연스러운 전개와 감정적 호흡을 고려하여 기획해주세요.
안정적이고 이해하기 쉬운 구조를 유지해주세요.
`
}

/**
 * 귀납법 구조 (사실→결론)
 * 구체적 사실들을 제시하고 일반적 결론을 도출
 */
function createInductivePrompt(input: PlanningInput): string {
  return `
영상 기획: ${input.title}
로그라인: ${input.logline}
장르: ${input.genre} | 타겟: ${input.target} | 분위기: ${input.toneManner}
구조: 귀납법 (구체적 사실 → 일반적 결론)

다음과 같은 귀납적 논증 구조로 ${input.duration} 영상을 기획해주세요:

1. 사실 제시 1 - 구체적 사례
   - 실제 경험이나 데이터 기반의 구체적 사실
   - 시청자가 확인할 수 있는 현실적 내용
   - "${input.target}"이 경험해봤을 법한 상황

2. 사실 제시 2 - 추가 증거
   - 첫 번째 사실을 뒷받침하는 추가 사례
   - 다양한 각도에서의 증거 자료
   - "${input.toneManner}" 분위기로 설득력 강화

3. 사실 제시 3 - 결정적 증거
   - 결론을 확신시킬 결정적 사실
   - 가장 임팩트 있고 설득력 있는 근거
   - 논리적 연결고리가 명확한 내용

4. 결론 도출 - 일반화
   - 앞서 제시한 사실들로부터 도출되는 결론
   - 시청자가 스스로 깨달을 수 있도록 유도
   - 브랜드/메시지와 자연스럽게 연결

논리적 일관성을 유지하면서 설득력 있는 구성을 만들어주세요.
시청자가 스스로 결론에 도달했다고 느낄 수 있도록 해주세요.
`
}

/**
 * 연역법 구조 (결론→근거)
 * 결론을 먼저 제시하고 이를 뒷받침하는 근거 제시
 */
function createDeductivePrompt(input: PlanningInput): string {
  return `
영상 기획: ${input.title}
로그라인: ${input.logline}
장르: ${input.genre} | 타겟: ${input.target} | 분위기: ${input.toneManner}
구조: 연역법 (결론 먼저 → 근거 제시)

다음과 같은 연역적 논증 구조로 ${input.duration} 영상을 기획해주세요:

1. 결론 제시 - 핵심 메시지
   - 전달하고자 하는 핵심 결론을 명확히 제시
   - 강력하고 임팩트 있는 선언문 형태
   - "${input.target}"의 관심을 즉시 끌 수 있는 내용

2. 근거 1 - 주요 뒷받침
   - 결론을 뒷받침하는 첫 번째 강력한 근거
   - 데이터, 사례, 경험 등 구체적 증거
   - "${input.toneManner}" 분위기로 신뢰성 구축

3. 근거 2 - 보완 증거
   - 다른 각도에서의 추가적 근거
   - 반박 가능한 부분을 미리 차단하는 내용
   - 논리의 완결성을 높이는 요소

4. 강화/확신 - 결론 재확인
   - 제시된 근거들을 종합한 결론 재강조
   - 시청자에게 확신을 심어주는 마무리
   - 행동 유도나 다음 단계 제시

명확하고 논리적인 구조로 설득력을 극대화해주세요.
결론이 자연스럽고 당연하게 느껴지도록 구성해주세요.
`
}

/**
 * 다큐멘터리 인터뷰 구조
 * 전문가 인터뷰와 사실 기반의 객관적 구조
 */
function createDocumentaryPrompt(input: PlanningInput): string {
  return `
영상 기획: ${input.title}
로그라인: ${input.logline}
장르: ${input.genre} | 타겟: ${input.target} | 분위기: ${input.toneManner}
구조: 다큐멘터리 인터뷰식 (사실 기반 객관적 접근)

다음과 같은 다큐멘터리 구조로 ${input.duration} 영상을 기획해주세요:

1. 문제 제기 - 이슈 소개
   - 다룰 주제나 문제를 객관적으로 제시
   - 왜 이 주제가 중요한지 배경 설명
   - "${input.target}"에게 왜 관련이 있는지 연결

2. 전문가 관점 - 인터뷰/증언
   - 해당 분야 전문가의 의견이나 분석
   - 객관적 데이터와 전문적 견해
   - "${input.toneManner}" 분위기로 신뢰감 조성

3. 현실 사례 - 실제 상황
   - 실제 사례나 현장의 생생한 모습
   - 문제의 실질적 영향이나 결과
   - 시청자가 체감할 수 있는 구체적 내용

4. 결론/전망 - 의미 부여
   - 앞서 제시한 내용들의 의미와 시사점
   - 미래 전망이나 해결 방향 제시
   - 시청자에게 주는 교훈이나 생각할 거리

객관적이고 균형 잡힌 시각을 유지해주세요.
사실과 의견을 명확히 구분하여 신뢰성을 높여주세요.
`
}

/**
 * 픽사 스토리텔링 구조 (감정호소)
 * 감정적 연결과 공감을 중심으로 한 구조
 */
function createPixarPrompt(input: PlanningInput): string {
  return `
영상 기획: ${input.title}
로그라인: ${input.logline}
장르: ${input.genre} | 타겟: ${input.target} | 분위기: ${input.toneManner}
구조: 픽사 스토리텔링 (감정적 몰입과 공감)

다음과 같은 감정 중심 구조로 ${input.duration} 영상을 기획해주세요:

1. 공감대 형성 - 일상의 순간
   - 시청자가 쉽게 공감할 수 있는 일상적 상황
   - 모두가 경험해봤을 법한 보편적 감정
   - "${input.target}"의 라이프스타일과 연결되는 장면

2. 감정적 갈등 - 문제 상황
   - 주인공(또는 상황)이 직면하는 감정적 어려움
   - 시청자도 함께 안타까워할 수 있는 상황
   - "${input.toneManner}" 분위기로 감정 이입 유도

3. 성장/깨달음 - 변화의 순간
   - 갈등 해결을 위한 노력이나 깨달음의 순간
   - 감정적으로 가장 몰입되는 절정 부분
   - 희로애락의 감정이 응축된 장면

4. 따뜻한 마무리 - 감동적 결말
   - 따뜻하고 희망적인 메시지 전달
   - 시청자에게 긍정적 에너지를 주는 결말
   - 일상으로 돌아가서도 기억에 남을 여운

감정의 기복과 호흡을 자연스럽게 조절해주세요.
시청자가 마음으로 느낄 수 있는 진정성 있는 스토리를 만들어주세요.
`
}

// ===========================
// Prompt Template Selector
// ===========================

export function getStoryPrompt(input: PlanningInput): string {
  switch (input.storyStructure) {
    case '훅–몰입–반전–떡밥':
      return createHookImmersionTwistBaitPrompt(input)
    
    case '기승전결':
      return createClassicStructurePrompt(input)
    
    case '귀납법':
      return createInductivePrompt(input)
    
    case '연역법':
      return createDeductivePrompt(input)
    
    case '다큐(인터뷰식)':
      return createDocumentaryPrompt(input)
    
    case '픽사 스토리텔링':
      return createPixarPrompt(input)
    
    default:
      return createClassicStructurePrompt(input) // 기본값
  }
}

// ===========================
// Advanced Prompt Engineering
// ===========================

/**
 * 간접적 스토리 발전 프롬프트
 * 키워드를 직접 언급하지 않고 자연스럽게 스토리에 통합
 */
export function createIndirectStoryPrompt(input: PlanningInput, keywords?: string[]): string {
  const basePrompt = getStoryPrompt(input)
  
  if (!keywords?.length) return basePrompt
  
  const indirectInstructions = `

**간접 스토리 발전 가이드라인:**
다음 키워드들을 직접 언급하지 말고, 자연스럽게 스토리 상황과 감정에 녹여서 표현해주세요:
${keywords.map(keyword => `- ${keyword}: 이 개념을 상황이나 감정으로 암시`).join('\n')}

**90% 간접 반영 목표:**
- 키워드 직접 언급: 최대 10%
- 상황/감정을 통한 암시: 90%
- 시청자가 스스로 연상할 수 있도록 유도

**자연스러운 통합 방법:**
- 시각적 메타포나 상징 활용
- 등장인물의 행동과 감정을 통한 표현
- 배경이나 소품을 통한 간접적 암시
- 대화나 내레이션의 뉘앙스로 전달

키워드를 강제로 끼워넣지 말고, 스토리의 자연스러운 흐름 속에서 
시청자가 무의식적으로 느낄 수 있도록 구성해주세요.
`
  
  return basePrompt + indirectInstructions
}

/**
 * 스토리 구조별 차별화 포인트
 */
export function getStructureDifferentiation(structure: StoryStructure): string {
  const differentiationMap = {
    '훅–몰입–반전–떡밥': '바이럴 요소와 재시청 유도에 특화',
    '기승전결': '안정적이고 이해하기 쉬운 전통적 구조',
    '귀납법': '논리적 설득력과 단계적 이해 증진',
    '연역법': '강력한 임팩트와 확신을 주는 구조',
    '다큐(인터뷰식)': '객관적 신뢰성과 전문성 강조',
    '픽사 스토리텔링': '감정적 몰입과 공감대 형성에 특화'
  }
  
  return differentiationMap[structure] || '기본적인 스토리텔링 구조'
}

// ===========================
// Utility Functions
// ===========================

/**
 * 프롬프트 품질 검증
 */
export function validatePromptQuality(prompt: string): {
  isValid: boolean
  issues: string[]
  score: number
} {
  const issues: string[] = []
  let score = 100
  
  // 길이 검증
  if (prompt.length < 500) {
    issues.push('프롬프트가 너무 짧습니다 (최소 500자)')
    score -= 20
  }
  
  if (prompt.length > 3000) {
    issues.push('프롬프트가 너무 깁니다 (최대 3000자)')
    score -= 10
  }
  
  // 구조 검증
  const hasStructure = /1\.|2\.|3\.|4\./.test(prompt)
  if (!hasStructure) {
    issues.push('4단계 구조가 명확하지 않습니다')
    score -= 30
  }
  
  // 키워드 포함 검증
  const hasKeyElements = ['장르', '타겟', '분위기'].every(element => 
    prompt.includes(element)
  )
  if (!hasKeyElements) {
    issues.push('필수 요소(장르, 타겟, 분위기)가 누락되었습니다')
    score -= 20
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    score: Math.max(0, score)
  }
}