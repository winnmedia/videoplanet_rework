import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { 
  envSchema, 
  geminiRequestSchema, 
  geminiResponseSchema,
  type GeminiRequest, 
  type GeminiResponse,
  type StoryBriefing,
  type FourActStructure,
  type TwelveShotPlan,
  type QualityMetrics,
  storyBriefingSchema,
  fourActStructureSchema,
  twelveShotPlanSchema,
  qualityMetricsSchema,
} from './types';

// 환경 변수 검증
const env = envSchema.parse({
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

class GeminiClient {
  private client: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({ model: 'gemini-1.5-pro' });
  }

  /**
   * 기본 텍스트 생성 API
   */
  async generateText(request: GeminiRequest): Promise<GeminiResponse> {
    try {
      // 입력 검증
      const validatedRequest = geminiRequestSchema.parse(request);

      const result = await this.model.generateContent(validatedRequest.prompt);
      const response = await result.response;
      const text = response.text();

      // 사용량 정보 (실제 API에서 제공되는 경우에만)
      const usage = {
        promptTokens: 0, // Gemini API에서 제공하지 않을 경우 기본값
        completionTokens: 0,
        totalTokens: 0,
      };

      const geminiResponse = {
        text,
        usage,
      };

      // 출력 검증
      return geminiResponseSchema.parse(geminiResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Input validation failed: ${error.message}`);
      }
      throw new Error(`Gemini API call failed: ${error}`);
    }
  }

  /**
   * 4막 구조 생성 (스토리 기획안 → 4막 구조)
   */
  async generateFourActStructure(briefing: StoryBriefing): Promise<{
    structure: FourActStructure;
    qualityMetrics: QualityMetrics;
    suggestions: string[];
  }> {
    try {
      // 입력 검증
      const validatedBriefing = storyBriefingSchema.parse(briefing);

      const prompt = `
다음 영상 프로젝트를 위한 4막 구조를 생성해주세요:

제목: ${validatedBriefing.title}
기획안: ${validatedBriefing.briefing}
${validatedBriefing.genre ? `장르: ${validatedBriefing.genre}` : ''}
${validatedBriefing.targetDuration ? `목표 길이: ${validatedBriefing.targetDuration}분` : ''}
${validatedBriefing.targetAudience ? `타겟 대상: ${validatedBriefing.targetAudience}` : ''}

다음 JSON 형식으로 응답해주세요:
{
  "acts": [
    {
      "id": "act-1",
      "title": "도입부 제목",
      "description": "도입부 상세 설명",
      "duration": 30,
      "order": 1
    },
    {
      "id": "act-2", 
      "title": "갈등 발생",
      "description": "갈등 발생 상세 설명",
      "duration": 60,
      "order": 2
    },
    {
      "id": "act-3",
      "title": "클라이맥스",
      "description": "클라이맥스 상세 설명", 
      "duration": 90,
      "order": 3
    },
    {
      "id": "act-4",
      "title": "해결",
      "description": "해결 상세 설명",
      "duration": 30,
      "order": 4
    }
  ],
  "qualityMetrics": {
    "consistency": 85,
    "characterDevelopment": 78,
    "narrativeFlow": 92,
    "overallScore": 85
  },
  "suggestions": ["개선 제안 1", "개선 제안 2"]
}
`;

      const response = await this.generateText({
        prompt,
        temperature: 0.7,
        maxTokens: 2000,
      });

      // JSON 파싱 및 검증
      let parsedData;
      try {
        parsedData = JSON.parse(response.text);
      } catch (parseError) {
        throw new Error('Failed to parse Gemini response as JSON');
      }

      // 4막 구조 검증 및 변환
      const totalDuration = parsedData.acts.reduce((sum: number, act: any) => sum + act.duration, 0);
      
      const structure: FourActStructure = {
        projectId: validatedBriefing.projectId,
        acts: parsedData.acts,
        totalDuration,
        createdAt: new Date(),
      };

      const validatedStructure = fourActStructureSchema.parse(structure);
      const validatedMetrics = qualityMetricsSchema.parse(parsedData.qualityMetrics);

      return {
        structure: validatedStructure,
        qualityMetrics: validatedMetrics,
        suggestions: parsedData.suggestions || [],
      };
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation failed: ${error.message}`);
      }
      throw new Error(`4-act structure generation failed: ${error}`);
    }
  }

  /**
   * 12샷 상세 계획 생성 (4막 중 하나 → 12샷 세분화)
   */
  async generateTwelveShotPlan(
    projectId: string, 
    actId: string, 
    actDescription: string
  ): Promise<TwelveShotPlan> {
    try {
      const prompt = `
다음 막(Act)을 최대 12개의 상세한 샷(Shot)으로 분해해주세요:

Act 설명: ${actDescription}

각 샷은 다음을 포함해야 합니다:
- 샷 제목
- 상세 설명
- 예상 지속 시간 (초 단위)
- 카메라 앵글 (선택사항)
- 대사 (선택사항)
- 액션 (선택사항)

다음 JSON 형식으로 응답해주세요:
{
  "shots": [
    {
      "id": "shot-1",
      "actId": "${actId}",
      "title": "샷 제목",
      "description": "샷 상세 설명",
      "duration": 15,
      "cameraAngle": "클로즈업",
      "dialogue": "대사 내용",
      "action": "액션 설명",
      "order": 1
    }
  ]
}
`;

      const response = await this.generateText({
        prompt,
        temperature: 0.8,
        maxTokens: 3000,
      });

      let parsedData;
      try {
        parsedData = JSON.parse(response.text);
      } catch (parseError) {
        throw new Error('Failed to parse Gemini response as JSON');
      }

      const totalDuration = parsedData.shots.reduce((sum: number, shot: any) => sum + shot.duration, 0);

      const plan: TwelveShotPlan = {
        projectId,
        actId,
        shots: parsedData.shots,
        totalDuration,
        createdAt: new Date(),
      };

      return twelveShotPlanSchema.parse(plan);

    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation failed: ${error.message}`);
      }
      throw new Error(`12-shot plan generation failed: ${error}`);
    }
  }
}

// 싱글톤 인스턴스
export const geminiClient = new GeminiClient(env.GEMINI_API_KEY);

// 개별 함수 exports
export const generateText = (request: GeminiRequest) => geminiClient.generateText(request);
export const generateFourActStructure = (briefing: StoryBriefing) => 
  geminiClient.generateFourActStructure(briefing);
export const generateTwelveShotPlan = (projectId: string, actId: string, actDescription: string) =>
  geminiClient.generateTwelveShotPlan(projectId, actId, actDescription);