/**
 * @fileoverview AI 스토리 생성을 위한 프롬프트 템플릿
 * @description 장르별 최적화된 프롬프트 (광고/드라마/다큐멘터리)
 */

import type { StoryGenerationRequest, PromptTemplate } from '../model/types'

/**
 * 장르별 프롬프트 템플릿
 * 각 템플릿은 해당 장르의 특성에 최적화됨
 */
const PROMPT_TEMPLATES: Record<StoryGenerationRequest['genre'], PromptTemplate> = {
  '광고': {
    genre: '광고',
    template: `영상 기획 전문가로서 다음 조건에 맞는 광고 영상 4단계 스토리 구조를 JSON 형식으로 생성해주세요:

장르: {{genre}}
타겟: {{target}}
영상 길이: {{duration}}초  
컨셉: {{concept}}
무드: {{mood}}

광고 영상에 최적화된 4단계 구조로 작성해주세요:
1. 도입부 (어텐션): 시청자의 관심 끌기
2. 전개부 (인터레스트): 문제 제시 및 공감대 형성  
3. 클라이맥스 (디자이어): 제품/서비스 소개 및 해결책 제시
4. 마무리 (액션): 행동 유도 (CTA)

다음 JSON 형식으로 정확히 응답해주세요:
{
  "stages": [
    {
      "id": "1",
      "title": "도입부 (어텐션)",
      "content": "시청자의 관심을 끄는 구체적인 장면 설명",
      "goal": "첫 5초 이내 주목도 확보",
      "duration": "{{duration_1}}초"
    },
    {
      "id": "2", 
      "title": "전개부 (인터레스트)",
      "content": "타겟이 공감할 수 있는 문제 상황 제시",
      "goal": "타겟의 니즈와 공감대 형성",
      "duration": "{{duration_2}}초"
    },
    {
      "id": "3",
      "title": "클라이맥스 (디자이어)",
      "content": "제품/서비스를 통한 해결책과 베네핏 제시",
      "goal": "구매 욕구 유발 및 브랜드 인식",
      "duration": "{{duration_3}}초"
    },
    {
      "id": "4",
      "title": "마무리 (액션)",
      "content": "명확한 행동 유도 메시지 및 브랜드 로고",
      "goal": "구체적인 행동 유도 (구매, 방문, 문의 등)",
      "duration": "{{duration_4}}초"
    }
  ]
}`,
    estimatedTokens: 350,
    description: 'AIDA 법칙을 적용한 광고 영상 최적화 템플릿'
  },

  '드라마': {
    genre: '드라마',
    template: `영상 기획 전문가로서 다음 조건에 맞는 드라마 영상 4단계 스토리 구조를 JSON 형식으로 생성해주세요:

장르: {{genre}}
타겟: {{target}}
영상 길이: {{duration}}초
컨셉: {{concept}}
무드: {{mood}}

드라마의 기본 서사 구조에 맞춰 4단계로 작성해주세요:
1. 발단 (도입): 인물과 상황 소개
2. 전개 (갈등): 문제 발생 및 갈등 심화
3. 절정 (클라이맥스): 갈등의 최고조
4. 결말 (해결): 갈등 해결 및 마무리

다음 JSON 형식으로 정확히 응답해주세요:
{
  "stages": [
    {
      "id": "1",
      "title": "발단 (도입)",
      "content": "주인공과 배경 상황을 자연스럽게 소개하는 장면",
      "goal": "인물과 상황에 대한 이해와 몰입도 형성",
      "duration": "{{duration_1}}초"
    },
    {
      "id": "2",
      "title": "전개 (갈등)",
      "content": "주인공이 직면한 문제나 갈등 상황 제시",
      "goal": "긴장감 조성 및 스토리 몰입도 증대",
      "duration": "{{duration_2}}초"
    },
    {
      "id": "3",
      "title": "절정 (클라이맥스)", 
      "content": "갈등이 최고조에 달하는 결정적 순간",
      "goal": "감정적 절정 및 시청자 몰입 극대화",
      "duration": "{{duration_3}}초"
    },
    {
      "id": "4",
      "title": "결말 (해결)",
      "content": "갈등 해결 및 여운을 남기는 마무리",
      "goal": "만족스러운 결말과 감동 전달",
      "duration": "{{duration_4}}초"
    }
  ]
}`,
    estimatedTokens: 320,
    description: '고전 서사 구조를 따르는 드라마 최적화 템플릿'
  },

  '다큐멘터리': {
    genre: '다큐멘터리',
    template: `영상 기획 전문가로서 다음 조건에 맞는 다큐멘터리 영상 4단계 스토리 구조를 JSON 형식으로 생성해주세요:

장르: {{genre}}
타겟: {{target}}
영상 길이: {{duration}}초
컨셉: {{concept}}
무드: {{mood}}

다큐멘터리의 논리적 전개 방식에 맞춰 4단계로 작성해주세요:
1. 문제 제기 (도입): 주제 소개 및 문제 의식
2. 현황 분석 (전개): 현재 상황과 배경 설명
3. 핵심 내용 (클라이맥스): 주요 사실이나 인사이트 제시
4. 결론 (마무리): 메시지 전달 및 행동 촉구

다음 JSON 형식으로 정확히 응답해주세요:
{
  "stages": [
    {
      "id": "1",
      "title": "문제 제기 (도입)",
      "content": "다룰 주제와 문제 의식을 명확히 제시하는 오프닝",
      "goal": "시청자의 관심과 문제 의식 환기",
      "duration": "{{duration_1}}초"
    },
    {
      "id": "2",
      "title": "현황 분석 (전개)",
      "content": "주제와 관련된 현재 상황과 배경 정보 제공",
      "goal": "객관적 사실과 데이터를 통한 이해도 증진",
      "duration": "{{duration_2}}초"
    },
    {
      "id": "3",
      "title": "핵심 내용 (클라이맥스)",
      "content": "가장 중요한 사실, 인터뷰, 또는 발견 내용 제시",
      "goal": "핵심 메시지와 인사이트 전달",
      "duration": "{{duration_3}}초"
    },
    {
      "id": "4",
      "title": "결론 (마무리)",
      "content": "주제에 대한 결론과 시청자에게 전하고 싶은 메시지",
      "goal": "생각할 거리 제공 및 행동 변화 유도",
      "duration": "{{duration_4}}초"
    }
  ]
}`,
    estimatedTokens: 340,
    description: '논리적 구조와 사실 전달에 최적화된 다큐멘터리 템플릿'
  }
}

/**
 * 프롬프트 템플릿 관리 클래스
 * 단순하고 안정적인 템플릿 처리
 */
export class PromptTemplateManager {
  
  /**
   * 장르에 맞는 프롬프트 생성
   * @param request - 스토리 생성 요청
   * @returns 완성된 프롬프트 문자열
   */
  static buildPrompt(request: StoryGenerationRequest): string {
    const template = PROMPT_TEMPLATES[request.genre]
    
    if (!template) {
      throw new Error(`지원하지 않는 장르입니다: ${request.genre}`)
    }

    // 시간 배분 계산 (간단한 비율 적용)
    const timeDistribution = this.calculateTimeDistribution(request.duration, request.genre)

    // 템플릿 변수 치환
    return template.template
      .replace(/\{\{genre\}\}/g, request.genre)
      .replace(/\{\{target\}\}/g, request.target)
      .replace(/\{\{duration\}\}/g, String(request.duration))
      .replace(/\{\{concept\}\}/g, request.concept)
      .replace(/\{\{mood\}\}/g, request.mood)
      .replace(/\{\{duration_1\}\}/g, String(timeDistribution[0]))
      .replace(/\{\{duration_2\}\}/g, String(timeDistribution[1]))
      .replace(/\{\{duration_3\}\}/g, String(timeDistribution[2]))
      .replace(/\{\{duration_4\}\}/g, String(timeDistribution[3]))
  }

  /**
   * 장르별 최적화된 시간 배분 계산
   * @param totalDuration - 총 영상 시간
   * @param genre - 영상 장르
   * @returns 4단계 시간 배분 배열
   */
  private static calculateTimeDistribution(
    totalDuration: number, 
    genre: StoryGenerationRequest['genre']
  ): [number, number, number, number] {
    // 장르별 시간 배분 비율
    const ratios = {
      '광고': [0.2, 0.3, 0.35, 0.15],      // 어텐션 짧게, 디자이어 길게
      '드라마': [0.25, 0.35, 0.25, 0.15],   // 균등하게 전개, 갈등 중심
      '다큐멘터리': [0.15, 0.4, 0.3, 0.15] // 현황 분석 길게, 문제 제기 짧게
    }

    const ratio = ratios[genre]
    
    return [
      Math.round(totalDuration * ratio[0]),
      Math.round(totalDuration * ratio[1]),
      Math.round(totalDuration * ratio[2]),
      Math.round(totalDuration * ratio[3])
    ]
  }

  /**
   * 사용 가능한 장르 목록 반환
   */
  static getSupportedGenres(): StoryGenerationRequest['genre'][] {
    return Object.keys(PROMPT_TEMPLATES) as StoryGenerationRequest['genre'][]
  }

  /**
   * 특정 장르의 템플릿 정보 반환
   */
  static getTemplateInfo(genre: StoryGenerationRequest['genre']): PromptTemplate | null {
    return PROMPT_TEMPLATES[genre] || null
  }

  /**
   * 예상 토큰 수 계산
   */
  static estimateTokenCount(request: StoryGenerationRequest): number {
    const template = PROMPT_TEMPLATES[request.genre]
    if (!template) return 0
    
    // 기본 토큰 + 입력 내용 길이 고려
    const inputLength = request.concept.length + request.target.length + request.mood.length
    return template.estimatedTokens + Math.floor(inputLength / 4)
  }
}