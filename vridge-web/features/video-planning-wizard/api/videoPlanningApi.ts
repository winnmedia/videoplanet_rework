/**
 * @fileoverview 영상 기획 위저드 API 서비스
 * @description Railway 백엔드의 Google Gemini API를 통한 영상 기획 자동화
 */

import { apiClient } from '@/shared/api/apiClient'
import type {
  GenerateStagesRequest,
  GenerateStagesResponse,
  GenerateShotsRequest,
  GenerateShotsResponse,
  GenerateStoryboardRequest,
  GenerateStoryboardResponse,
  ExportPlanRequest,
  ExportPlanResponse,
  PlanningInput,
  PlanningStage,
  VideoShot,
  InsertShot
} from '../model/types'

/**
 * 영상 기획 위저드 API 클래스
 */
export class VideoPlanningWizardApi {
  private static readonly BASE_PATH = '/api/video-planning'

  /**
   * STEP 1 → STEP 2: 기본 정보를 바탕으로 4단계 기획 생성
   */
  static async generateFourStages(input: PlanningInput): Promise<PlanningStage[]> {
    const request: GenerateStagesRequest = { input }

    try {
      const response = await apiClient.post<GenerateStagesResponse>(
        `${this.BASE_PATH}/generate-stages`,
        request,
        {
          timeout: 30000, // 30초 타임아웃 (LLM 응답 대기)
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.success) {
        throw new Error(response.error || '4단계 기획 생성에 실패했습니다.')
      }

      return response.stages
    } catch (error) {
      console.error('Generate four stages error:', error)
      
      if (error instanceof Error) {
        throw error
      }
      
      throw new Error('서버와 통신 중 오류가 발생했습니다.')
    }
  }

  /**
   * STEP 2 → STEP 3: 4단계 기획을 바탕으로 12개 숏 생성
   */
  static async generateTwelveShots(
    stages: PlanningStage[], 
    originalInput: PlanningInput
  ): Promise<{ shots: VideoShot[]; insertShots: InsertShot[] }> {
    const request: GenerateShotsRequest = { stages, input: originalInput }

    try {
      const response = await apiClient.post<GenerateShotsResponse>(
        `${this.BASE_PATH}/generate-shots`,
        request,
        {
          timeout: 45000, // 45초 타임아웃 (더 복잡한 생성)
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.success) {
        throw new Error(response.error || '12개 숏 생성에 실패했습니다.')
      }

      return {
        shots: response.shots,
        insertShots: response.insertShots
      }
    } catch (error) {
      console.error('Generate twelve shots error:', error)
      
      if (error instanceof Error) {
        throw error
      }
      
      throw new Error('서버와 통신 중 오류가 발생했습니다.')
    }
  }

  /**
   * 개별 숏의 스토리보드 이미지 생성
   */
  static async generateStoryboard(shot: VideoShot): Promise<string> {
    const request: GenerateStoryboardRequest = { shot }

    try {
      const response = await apiClient.post<GenerateStoryboardResponse>(
        `${this.BASE_PATH}/generate-storyboard`,
        request,
        {
          timeout: 60000, // 60초 타임아웃 (이미지 생성)
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.success) {
        throw new Error(response.error || '스토리보드 생성에 실패했습니다.')
      }

      return response.storyboardUrl
    } catch (error) {
      console.error('Generate storyboard error:', error)
      
      if (error instanceof Error) {
        throw error
      }
      
      throw new Error('스토리보드 생성 중 오류가 발생했습니다.')
    }
  }

  /**
   * 기획서 내보내기 (JSON/PDF)
   */
  static async exportPlan(
    fourStagesPlan: any,
    twelveShotsPlan: any,
    options: { format: 'json' | 'pdf'; includeStoryboard: boolean; includeInserts: boolean }
  ): Promise<string> {
    const request: ExportPlanRequest = {
      fourStagesPlan,
      twelveShotsPlan,
      options: {
        ...options,
        pdfLayout: 'landscape' // A4 가로 고정
      }
    }

    try {
      const response = await apiClient.post<ExportPlanResponse>(
        `${this.BASE_PATH}/export-plan`,
        request,
        {
          timeout: 120000, // 120초 타임아웃 (PDF 생성)
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.success) {
        throw new Error(response.error || '기획서 내보내기에 실패했습니다.')
      }

      return response.downloadUrl
    } catch (error) {
      console.error('Export plan error:', error)
      
      if (error instanceof Error) {
        throw error
      }
      
      throw new Error('기획서 내보내기 중 오류가 발생했습니다.')
    }
  }

  /**
   * 프로젝트 저장 (향후 불러오기용)
   */
  static async savePlanningProject(projectData: {
    title: string
    input: PlanningInput
    stages: PlanningStage[]
    shots: VideoShot[]
    insertShots: InsertShot[]
  }): Promise<string> {
    try {
      const response = await apiClient.post<{ success: boolean; projectId: string; error?: string }>(
        `${this.BASE_PATH}/save-project`,
        projectData,
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.success) {
        throw new Error(response.error || '프로젝트 저장에 실패했습니다.')
      }

      return response.projectId
    } catch (error) {
      console.error('Save planning project error:', error)
      
      if (error instanceof Error) {
        throw error
      }
      
      throw new Error('프로젝트 저장 중 오류가 발생했습니다.')
    }
  }

  /**
   * 저장된 프로젝트 불러오기
   */
  static async loadPlanningProject(projectId: string): Promise<{
    title: string
    input: PlanningInput
    stages: PlanningStage[]
    shots: VideoShot[]
    insertShots: InsertShot[]
  }> {
    try {
      const response = await apiClient.get<{
        success: boolean
        project?: {
          title: string
          input: PlanningInput
          stages: PlanningStage[]
          shots: VideoShot[]
          insertShots: InsertShot[]
        }
        error?: string
      }>(`${this.BASE_PATH}/load-project/${projectId}`)

      if (!response.success || !response.project) {
        throw new Error(response.error || '프로젝트를 찾을 수 없습니다.')
      }

      return response.project
    } catch (error) {
      console.error('Load planning project error:', error)
      
      if (error instanceof Error) {
        throw error
      }
      
      throw new Error('프로젝트 불러오기 중 오류가 발생했습니다.')
    }
  }

  /**
   * 사용자의 프로젝트 목록 조회
   */
  static async getUserProjects(): Promise<Array<{
    id: string
    title: string
    createdAt: string
    updatedAt: string
    progress: number
  }>> {
    try {
      const response = await apiClient.get<{
        success: boolean
        projects?: Array<{
          id: string
          title: string
          createdAt: string
          updatedAt: string
          progress: number
        }>
        error?: string
      }>(`${this.BASE_PATH}/user-projects`)

      if (!response.success || !response.projects) {
        throw new Error(response.error || '프로젝트 목록을 가져올 수 없습니다.')
      }

      return response.projects
    } catch (error) {
      console.error('Get user projects error:', error)
      
      if (error instanceof Error) {
        throw error
      }
      
      throw new Error('프로젝트 목록 조회 중 오류가 발생했습니다.')
    }
  }
}

/**
 * 유틸리티 함수들
 */
export const videoPlanningUtils = {
  /**
   * 총 예상 시간 계산
   */
  calculateTotalDuration(shots: VideoShot[]): number {
    return shots.reduce((total, shot) => total + shot.duration, 0)
  },

  /**
   * 단계별 시간 배분 계산
   */
  calculateStageDistribution(stages: PlanningStage[]): Record<string, number> {
    const distribution: Record<string, number> = {}
    
    stages.forEach(stage => {
      const duration = stage.duration.match(/\d+/)?.[0] || '0'
      distribution[stage.id] = parseInt(duration)
    })
    
    return distribution
  },

  /**
   * 샷 유형별 개수 계산
   */
  analyzeShotTypes(shots: VideoShot[]): Record<string, number> {
    const analysis: Record<string, number> = {}
    
    shots.forEach(shot => {
      analysis[shot.shotType] = (analysis[shot.shotType] || 0) + 1
    })
    
    return analysis
  },

  /**
   * 기획서 품질 점수 계산 (1-100점)
   */
  calculateQualityScore(stages: PlanningStage[], shots: VideoShot[]): number {
    let score = 0
    
    // 4단계 완성도 (40점)
    const stagesScore = stages.reduce((acc, stage) => {
      let stageScore = 0
      if (stage.content.length > 20) stageScore += 5 // 내용 충실도
      if (stage.goal.length > 5) stageScore += 3 // 목표 명확도
      if (stage.duration.length > 0) stageScore += 2 // 시간 계획
      return acc + stageScore
    }, 0)
    score += Math.min(stagesScore, 40)
    
    // 12숏 완성도 (60점)
    const shotsScore = shots.reduce((acc, shot) => {
      let shotScore = 0
      if (shot.title.length > 3) shotScore += 2 // 제목 완성도
      if (shot.description.length > 10) shotScore += 2 // 설명 완성도
      if (shot.duration > 0) shotScore += 1 // 시간 설정
      return acc + shotScore
    }, 0)
    score += Math.min(shotsScore, 60)
    
    return Math.max(0, Math.min(100, score))
  }
}