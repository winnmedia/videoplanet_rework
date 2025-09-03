import axios from 'axios';
import { z } from 'zod';
import type { 
  StoryBriefing,
  FourActStructure,
  TwelveShotPlan,
  QualityMetrics
} from '@/shared/api/gemini';

// API 응답 스키마
const fourActResponseSchema = z.object({
  structure: z.object({
    projectId: z.string(),
    acts: z.array(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      duration: z.number(),
      order: z.number(),
    })).length(4),
    totalDuration: z.number(),
    createdAt: z.date(),
  }),
  qualityMetrics: z.object({
    consistency: z.number().min(0).max(100),
    characterDevelopment: z.number().min(0).max(100),
    narrativeFlow: z.number().min(0).max(100),
    overallScore: z.number().min(0).max(100),
  }),
  suggestions: z.array(z.string()),
});

const twelveShotResponseSchema = z.object({
  projectId: z.string(),
  actId: z.string(),
  shots: z.array(z.object({
    id: z.string(),
    actId: z.string(),
    title: z.string(),
    description: z.string(),
    duration: z.number(),
    cameraAngle: z.string().optional(),
    dialogue: z.string().optional(),
    action: z.string().optional(),
    order: z.number(),
  })),
  totalDuration: z.number(),
  createdAt: z.date(),
});

export class StoryGenerationApi {
  private baseURL: string;

  constructor(baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') {
    this.baseURL = baseURL;
  }

  /**
   * 4막 구조 생성 API 호출
   */
  async generateFourActStructure(briefing: StoryBriefing): Promise<{
    structure: FourActStructure;
    qualityMetrics: QualityMetrics;
    suggestions: string[];
  }> {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/story/generate-four-act`,
        briefing,
        {
          timeout: 30000, // 30초 타임아웃
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // 응답 데이터 검증
      const validatedData = fourActResponseSchema.parse({
        ...response.data,
        structure: {
          ...response.data.structure,
          createdAt: new Date(response.data.structure.createdAt),
        },
      });

      return validatedData;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
        }
        if (error.response?.status === 429) {
          throw new Error('API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
        }
        if (error.response?.status === 500) {
          throw new Error('서버 오류가 발생했습니다. 관리자에게 문의해주세요.');
        }
        throw new Error(`API 호출 실패: ${error.response?.data?.error || error.message}`);
      }
      if (error instanceof z.ZodError) {
        throw new Error(`응답 데이터 검증 실패: ${error.message}`);
      }
      throw new Error(`4막 구조 생성 실패: ${error}`);
    }
  }

  /**
   * 12샷 상세 계획 생성 API 호출
   */
  async generateTwelveShotPlan(
    projectId: string,
    actId: string,
    actDescription: string
  ): Promise<TwelveShotPlan> {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/story/generate-twelve-shot`,
        {
          projectId,
          actId,
          actDescription,
        },
        {
          timeout: 45000, // 45초 타임아웃 (더 복잡한 작업)
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // 응답 데이터 검증
      const validatedData = twelveShotResponseSchema.parse({
        ...response.data,
        createdAt: new Date(response.data.createdAt),
      });

      return validatedData;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
        }
        if (error.response?.status === 429) {
          throw new Error('API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
        }
        if (error.response?.status === 500) {
          throw new Error('서버 오류가 발생했습니다. 관리자에게 문의해주세요.');
        }
        throw new Error(`API 호출 실패: ${error.response?.data?.error || error.message}`);
      }
      if (error instanceof z.ZodError) {
        throw new Error(`응답 데이터 검증 실패: ${error.message}`);
      }
      throw new Error(`12샷 계획 생성 실패: ${error}`);
    }
  }
}

// 싱글톤 인스턴스
export const storyGenerationApi = new StoryGenerationApi();