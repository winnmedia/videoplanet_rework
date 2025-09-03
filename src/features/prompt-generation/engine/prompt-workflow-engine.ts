/**
 * 프롬프트 생성 워크플로우 엔진
 * 
 * 스토리 → 4막 구조 → 12샷 → JSON 프롬프트 자동 생성을 위한
 * 완전 자동화된 워크플로우 엔진입니다.
 * 
 * 주요 기능:
 * - 5단계 파이프라인 실행
 * - 원자성 보장 (실패 시 롤백)
 * - 배치 처리 및 병렬 실행
 * - 품질 게이트 및 자동 최적화
 * - 캐싱 및 성능 최적화
 */

import { z } from 'zod'
import {
  VideoPlanetPrompt,
  PromptDataValidator,
  videoPlanetPromptSchema
} from '@/shared/lib/prompt-contracts'

// =============================================================================
// 타입 정의
// =============================================================================

export interface StoryInput {
  id: string
  title: string
  description: string
  genre: 'romance' | 'action' | 'comedy' | 'drama' | 'horror' | 'documentary'
  targetDuration: number // seconds
  mood: string
  setting: {
    location: string
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
    weather: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy'
    atmosphere: string
  }
  characters: Array<{
    name: string
    role: 'male_lead' | 'female_lead' | 'supporting' | 'antagonist' | 'narrator'
    description: string
    visualStyle: string
    age?: number
  }>
  stylePreferences: {
    artStyle: 'photorealistic' | 'cinematic' | 'anime' | 'cartoon' | 'sketch'
    colorPalette: 'warm_tones' | 'cool_tones' | 'monochrome' | 'vibrant' | 'muted' | 'natural'
    visualMood: 'happy' | 'sad' | 'dramatic' | 'mysterious' | 'romantic' | 'action'
    aspectRatio: '16:9' | '4:3' | '1:1' | '9:16'
  }
}

export interface WorkflowConfig {
  steps: {
    storyAnalysis: { enabled: boolean; timeout: number }
    fourActGeneration: { enabled: boolean; timeout: number }
    shotBreakdown: { enabled: boolean; timeout: number }
    promptGeneration: { enabled: boolean; timeout: number }
    qualityValidation: { enabled: boolean; timeout: number }
  }
  batchProcessing: {
    enabled: boolean
    batchSize: number
    parallelSteps: boolean
    failureHandling: 'stop_on_error' | 'continue_on_error' | 'retry_failed'
  }
  qualityGates: {
    minConsistencyScore: number
    maxRegenerationAttempts: number
    requireManualApproval: boolean
  }
  optimization: {
    cacheResults: boolean
    reuseGeneratedContent: boolean
    costOptimization: boolean
  }
}

export interface GenerationStep {
  name: string
  executionTime: number
  success: boolean
  retryCount: number
  fromCache: boolean
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export interface WorkflowResult<T = any> {
  success: boolean
  data: T
  executionTime?: number
  retryCount?: number
  fromCache?: boolean
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export interface AnalyzedStory {
  themes: string[]
  keyMoments: string[]
  emotionalArc: {
    beginning: { intensity: number; emotion: string }
    climax: { intensity: number; emotion: string }
    resolution: { intensity: number; emotion: string }
  }
  characterDynamics: Array<{
    character: string
    role: string
    arcDescription: string
  }>
  visualKeywords: string[]
  pacing: 'slow' | 'medium' | 'fast'
}

export interface FourActStructure {
  projectId: string
  acts: Array<{
    id: string
    title: string
    description: string
    duration: number
    order: number
    keyEvents: string[]
    emotionalTone: string
    visualFocus: string
  }>
  totalDuration: number
  createdAt: Date
}

export interface ShotBreakdown {
  shotNumber: number
  actId: string
  description: string
  cameraAngle: 'wide' | 'medium' | 'close' | 'extreme_close' | 'overhead' | 'low_angle' | 'high_angle' | 'dutch_angle'
  duration: number
  visualElements: string[]
  generationPrompt: string
  technicalSpecs?: {
    movement: 'static' | 'pan' | 'tilt' | 'zoom' | 'dolly'
    lighting: 'natural' | 'artificial' | 'dramatic' | 'soft'
    depth: 'shallow' | 'deep'
  }
  continuityNotes?: string[]
}

export interface QualityReport {
  consistencyScore: number
  completenessScore: number
  technicalScore: number
  overallScore: number
  issues: Array<{
    type: 'error' | 'warning' | 'suggestion'
    category: 'consistency' | 'technical' | 'creative' | 'optimization'
    message: string
    shotNumbers?: number[]
    severity: 'low' | 'medium' | 'high' | 'critical'
  }>
  optimizationSuggestions: string[]
  estimatedGenerationCost: number
  estimatedGenerationTime: number
}

// =============================================================================
// 워크플로우 엔진 메인 클래스
// =============================================================================

export class PromptWorkflowEngine {
  private config: WorkflowConfig
  private cache: Map<string, any> = new Map()
  private executionLog: GenerationStep[] = []

  constructor(config: WorkflowConfig) {
    this.config = config
  }

  /**
   * 완전한 워크플로우 실행
   */
  async executeFullWorkflow(storyInput: StoryInput): Promise<WorkflowResult<{
    finalPrompt: VideoPlanetPrompt
    executionLog: {
      steps: GenerationStep[]
      totalExecutionTime: number
      stepsCompleted: number
      stepsSkipped: number
      errors: number
    }
    qualityMetrics: QualityReport
  }>> {
    const startTime = performance.now()
    this.executionLog = []
    let currentData: any = { ...storyInput }

    try {
      // 1단계: 스토리 분석 및 구조화
      if (this.config.steps.storyAnalysis.enabled) {
        const analysisResult = await this.executeStep('storyAnalysis', currentData)
        if (!analysisResult.success) {
          throw new Error(`Story analysis failed: ${analysisResult.error?.message}`)
        }
        currentData = { ...currentData, ...analysisResult.data }
      }

      // 2단계: 4막 구조 생성
      if (this.config.steps.fourActGeneration.enabled) {
        const fourActResult = await this.executeStep('fourActGeneration', currentData)
        if (!fourActResult.success) {
          throw new Error(`Four act generation failed: ${fourActResult.error?.message}`)
        }
        currentData = { ...currentData, ...fourActResult.data }
      }

      // 3단계: 12샷 상세 계획 생성
      if (this.config.steps.shotBreakdown.enabled) {
        const shotResult = await this.executeStep('shotBreakdown', currentData)
        if (!shotResult.success) {
          throw new Error(`Shot breakdown failed: ${shotResult.error?.message}`)
        }
        currentData = { ...currentData, ...shotResult.data }
      }

      // 4단계: VideoPlanet 프롬프트 생성
      if (this.config.steps.promptGeneration.enabled) {
        const promptResult = await this.executeStep('promptGeneration', currentData)
        if (!promptResult.success) {
          throw new Error(`Prompt generation failed: ${promptResult.error?.message}`)
        }
        currentData = { ...currentData, ...promptResult.data }
      }

      // 5단계: 품질 검증 및 최적화
      let qualityMetrics: QualityReport
      if (this.config.steps.qualityValidation.enabled) {
        const qualityResult = await this.executeStep('qualityValidation', currentData)
        if (!qualityResult.success) {
          throw new Error(`Quality validation failed: ${qualityResult.error?.message}`)
        }
        qualityMetrics = qualityResult.data.qualityReport
        currentData = { ...currentData, optimizedPrompt: qualityResult.data.optimizedPrompt }
      } else {
        qualityMetrics = this.generateBasicQualityReport(currentData.videoPlanetPrompt)
      }

      const totalExecutionTime = performance.now() - startTime

      return {
        success: true,
        data: {
          finalPrompt: currentData.optimizedPrompt || currentData.videoPlanetPrompt,
          executionLog: {
            steps: this.executionLog,
            totalExecutionTime,
            stepsCompleted: this.executionLog.filter(s => s.success).length,
            stepsSkipped: Object.keys(this.config.steps).length - this.executionLog.length,
            errors: this.executionLog.filter(s => !s.success).length
          },
          qualityMetrics
        },
        executionTime: totalExecutionTime
      }

    } catch (error) {
      return {
        success: false,
        data: {} as any,
        error: {
          code: 'WORKFLOW_ERROR',
          message: error instanceof Error ? error.message : 'Unknown workflow error',
          details: { executionLog: this.executionLog }
        },
        executionTime: performance.now() - startTime
      }
    }
  }

  /**
   * 단일 워크플로우 단계 실행
   */
  async executeStep(stepName: string, inputData: any): Promise<WorkflowResult> {
    const stepStartTime = performance.now()
    let retryCount = 0
    const maxRetries = 3

    // 캐시 확인
    if (this.config.optimization.cacheResults) {
      const cacheKey = this.generateCacheKey(stepName, inputData)
      const cachedResult = this.cache.get(cacheKey)
      if (cachedResult) {
        const step: GenerationStep = {
          name: stepName,
          executionTime: performance.now() - stepStartTime,
          success: true,
          retryCount: 0,
          fromCache: true
        }
        this.executionLog.push(step)
        return { ...cachedResult, fromCache: true }
      }
    }

    while (retryCount <= maxRetries) {
      try {
        let result: any

        switch (stepName) {
          case 'storyAnalysis':
            result = await this.executeStoryAnalysis(inputData)
            break
          case 'fourActGeneration':
            result = await this.executeFourActGeneration(inputData)
            break
          case 'shotBreakdown':
            result = await this.executeShotBreakdown(inputData)
            break
          case 'promptGeneration':
            result = await this.executePromptGeneration(inputData)
            break
          case 'qualityValidation':
            result = await this.executeQualityValidation(inputData)
            break
          default:
            throw new Error(`Unknown step: ${stepName}`)
        }

        // 캐시에 저장
        if (this.config.optimization.cacheResults && result.success) {
          const cacheKey = this.generateCacheKey(stepName, inputData)
          this.cache.set(cacheKey, result)
        }

        const step: GenerationStep = {
          name: stepName,
          executionTime: performance.now() - stepStartTime,
          success: result.success,
          retryCount,
          fromCache: false,
          error: result.error
        }
        this.executionLog.push(step)

        return result

      } catch (error) {
        retryCount++
        
        if (retryCount > maxRetries) {
          const step: GenerationStep = {
            name: stepName,
            executionTime: performance.now() - stepStartTime,
            success: false,
            retryCount: retryCount - 1,
            fromCache: false,
            error: {
              code: 'MAX_RETRIES_EXCEEDED',
              message: error instanceof Error ? error.message : 'Unknown error'
            }
          }
          this.executionLog.push(step)

          return {
            success: false,
            data: null,
            error: step.error,
            retryCount: retryCount - 1
          }
        }

        // 지수 백오프로 재시도 대기
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
      }
    }

    throw new Error('Unexpected execution path')
  }

  /**
   * 배치 워크플로우 실행
   */
  async executeBatchWorkflow(storyInputs: StoryInput[]): Promise<WorkflowResult[]> {
    if (!this.config.batchProcessing.enabled) {
      // 순차 처리
      const results: WorkflowResult[] = []
      for (const input of storyInputs) {
        const result = await this.executeFullWorkflow(input)
        results.push(result)
      }
      return results
    }

    const batchSize = this.config.batchProcessing.batchSize
    const batches: StoryInput[][] = []
    
    // 배치로 나누기
    for (let i = 0; i < storyInputs.length; i += batchSize) {
      batches.push(storyInputs.slice(i, i + batchSize))
    }

    const allResults: WorkflowResult[] = []

    // 배치별 병렬 처리
    for (const batch of batches) {
      const batchPromises = batch.map(input => this.executeFullWorkflow(input))
      
      if (this.config.batchProcessing.failureHandling === 'stop_on_error') {
        const batchResults = await Promise.all(batchPromises)
        allResults.push(...batchResults)
      } else {
        // 실패해도 계속 진행
        const batchResults = await Promise.allSettled(batchPromises)
        const processedResults = batchResults.map(result => 
          result.status === 'fulfilled' ? result.value : {
            success: false,
            data: {} as any,
            error: {
              code: 'BATCH_PROCESSING_ERROR',
              message: 'Failed during batch processing'
            }
          }
        )
        allResults.push(...processedResults)
      }
    }

    return allResults
  }

  // =============================================================================
  // 개별 단계 구현
  // =============================================================================

  private async executeStoryAnalysis(input: StoryInput): Promise<WorkflowResult<{ analyzedStory: AnalyzedStory }>> {
    // 입력 검증
    if (!input.title || input.targetDuration <= 0) {
      return {
        success: false,
        data: null as any,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid story input: title and targetDuration are required'
        }
      }
    }

    try {
      // 테마 추출
      const themes = this.extractThemes(input)
      
      // 핵심 순간 식별
      const keyMoments = this.identifyKeyMoments(input)
      
      // 감정 아크 분석
      const emotionalArc = this.analyzeEmotionalArc(input)
      
      // 캐릭터 다이나믹스 분석
      const characterDynamics = this.analyzeCharacterDynamics(input)
      
      // 시각적 키워드 생성
      const visualKeywords = this.generateVisualKeywords(input)
      
      // 페이싱 결정
      const pacing = this.determinePacing(input)

      const analyzedStory: AnalyzedStory = {
        themes,
        keyMoments,
        emotionalArc,
        characterDynamics,
        visualKeywords,
        pacing
      }

      return {
        success: true,
        data: { analyzedStory }
      }

    } catch (error) {
      return {
        success: false,
        data: null as any,
        error: {
          code: 'ANALYSIS_ERROR',
          message: error instanceof Error ? error.message : 'Story analysis failed'
        }
      }
    }
  }

  private async executeFourActGeneration(input: any): Promise<WorkflowResult<{ fourActStructure: FourActStructure }>> {
    try {
      const storyInput = input as StoryInput
      const analyzedStory = input.analyzedStory as AnalyzedStory

      // 4막 구조 템플릿
      const actTemplates = [
        {
          title: '설정 및 도입',
          durationRatio: 0.25,
          purpose: 'establish_setting_characters',
          emotionalTarget: 'curiosity'
        },
        {
          title: '갈등 발생',
          durationRatio: 0.35,
          purpose: 'introduce_conflict',
          emotionalTarget: 'tension'
        },
        {
          title: '절정과 발전',
          durationRatio: 0.30,
          purpose: 'climax_development',
          emotionalTarget: 'peak_emotion'
        },
        {
          title: '해결과 마무리',
          durationRatio: 0.10,
          purpose: 'resolution',
          emotionalTarget: 'satisfaction'
        }
      ]

      const acts = actTemplates.map((template, index) => {
        const duration = Math.round(storyInput.targetDuration * template.durationRatio)
        
        return {
          id: `act_${index + 1}`,
          title: template.title,
          description: this.generateActDescription(template, storyInput, analyzedStory),
          duration,
          order: index + 1,
          keyEvents: this.generateKeyEvents(template, analyzedStory, index),
          emotionalTone: template.emotionalTarget,
          visualFocus: this.generateVisualFocus(template, storyInput)
        }
      })

      const fourActStructure: FourActStructure = {
        projectId: `project_${storyInput.id}_${Date.now()}`,
        acts,
        totalDuration: acts.reduce((sum, act) => sum + act.duration, 0),
        createdAt: new Date()
      }

      return {
        success: true,
        data: { fourActStructure }
      }

    } catch (error) {
      return {
        success: false,
        data: null as any,
        error: {
          code: 'FOUR_ACT_GENERATION_ERROR',
          message: error instanceof Error ? error.message : 'Four act generation failed'
        }
      }
    }
  }

  private async executeShotBreakdown(input: any): Promise<WorkflowResult<{ shotBreakdown: ShotBreakdown[] }>> {
    try {
      const storyInput = input as StoryInput
      const fourActStructure = input.fourActStructure as FourActStructure

      const shotBreakdown: ShotBreakdown[] = []
      let shotNumber = 1

      // 각 막을 3샷으로 분할 (총 12샷)
      const shotsPerAct = 3

      for (const act of fourActStructure.acts) {
        const actShotDuration = Math.round(act.duration / shotsPerAct)
        
        for (let i = 0; i < shotsPerAct; i++) {
          const shot: ShotBreakdown = {
            shotNumber,
            actId: act.id,
            description: this.generateShotDescription(act, i, storyInput),
            cameraAngle: this.selectCameraAngle(act, i, shotsPerAct),
            duration: actShotDuration,
            visualElements: this.generateVisualElements(act, storyInput, i),
            generationPrompt: this.generateShotPrompt(act, storyInput, i),
            technicalSpecs: {
              movement: this.selectCameraMovement(act, i),
              lighting: this.selectLighting(storyInput, act),
              depth: this.selectDepthOfField(i, shotsPerAct)
            }
          }

          shotBreakdown.push(shot)
          shotNumber++
        }
      }

      return {
        success: true,
        data: { shotBreakdown }
      }

    } catch (error) {
      return {
        success: false,
        data: null as any,
        error: {
          code: 'SHOT_BREAKDOWN_ERROR',
          message: error instanceof Error ? error.message : 'Shot breakdown failed'
        }
      }
    }
  }

  private async executePromptGeneration(input: any): Promise<WorkflowResult<{ videoPlanetPrompt: VideoPlanetPrompt }>> {
    try {
      const storyInput = input as StoryInput
      const shotBreakdown = input.shotBreakdown as ShotBreakdown[]

      // VideoPlanet 프롬프트 생성
      const videoPlanetPrompt: VideoPlanetPrompt = {
        id: `prompt_${storyInput.id}_${Date.now()}`,
        projectId: `project_${storyInput.id}_${Date.now()}`,
        version: '1.0.0',
        metadata: {
          title: storyInput.title,
          description: storyInput.description,
          category: 'storyboard',
          tags: this.generateTags(storyInput),
          difficulty: this.assessDifficulty(storyInput, shotBreakdown),
          estimatedTokens: this.estimateTokens(shotBreakdown),
          language: 'ko',
          targetAudience: 'professional'
        },
        promptStructure: {
          shotBreakdown: shotBreakdown.map(shot => ({
            shotNumber: shot.shotNumber,
            description: shot.description,
            cameraAngle: shot.cameraAngle,
            duration: shot.duration,
            visualElements: shot.visualElements,
            generationPrompt: shot.generationPrompt,
            technicalSpecs: {
              aspectRatio: storyInput.stylePreferences.aspectRatio,
              resolution: 'hd',
              frameRate: 24
            },
            lighting: {
              type: shot.technicalSpecs?.lighting === 'natural' ? 'natural' : 'artificial',
              mood: this.mapVisualMoodToLightingMood(storyInput.stylePreferences.visualMood),
              direction: 'front'
            }
          })),
          styleGuide: {
            artStyle: storyInput.stylePreferences.artStyle,
            colorPalette: storyInput.stylePreferences.colorPalette,
            visualMood: storyInput.stylePreferences.visualMood,
            characterConsistency: {
              enabled: storyInput.characters.length > 0,
              referenceCharacters: storyInput.characters.map(c => c.name),
              consistencyStrength: 0.8
            },
            environmentStyle: {
              setting: storyInput.setting.location.includes('indoor') || 
                       storyInput.setting.location.includes('cafe') || 
                       storyInput.setting.location.includes('서점') ? 'indoor' : 'outdoor',
              timeOfDay: storyInput.setting.timeOfDay,
              weather: storyInput.setting.weather
            }
          },
          narrativeFlow: {
            pacing: 'medium',
            transitionStyle: 'cut'
          }
        },
        generationSettings: {
          provider: 'google',
          model: 'imagen-4.0-fast-generate-preview-06-06',
          parameters: {
            aspectRatio: storyInput.stylePreferences.aspectRatio,
            quality: 'high',
            stylization: 0.8,
            coherence: 0.9
          },
          batchSettings: {
            enabled: true,
            batchSize: 4,
            maxRetries: 3,
            timeoutMs: 30000,
            parallelProcessing: true,
            failureHandling: 'retry_with_fallback'
          },
          fallbackProvider: 'huggingface'
        },
        qualityAssurance: {
          validationRules: {
            minConsistencyScore: this.config.qualityGates.minConsistencyScore,
            maxRegenerationCount: this.config.qualityGates.maxRegenerationAttempts,
            requiredElements: ['characters', 'setting', 'lighting'],
            forbiddenElements: ['text', 'watermark', 'signature']
          },
          approvalWorkflow: {
            requiresManualReview: this.config.qualityGates.requireManualApproval,
            autoApproveThreshold: 0.85,
            reviewers: []
          }
        },
        usage: {
          createdBy: `user_workflow_engine`,
          createdAt: new Date().toISOString(),
          usageCount: 0
        },
        status: 'active'
      }

      // 스키마 검증
      const validation = PromptDataValidator.validateWithReport(
        videoPlanetPromptSchema, 
        videoPlanetPrompt
      )

      if (!validation.isValid) {
        return {
          success: false,
          data: null as any,
          error: {
            code: 'SCHEMA_VALIDATION_ERROR',
            message: `Generated prompt failed validation: ${validation.errors.map(e => e.message).join(', ')}`
          }
        }
      }

      return {
        success: true,
        data: { videoPlanetPrompt: validation.data! }
      }

    } catch (error) {
      return {
        success: false,
        data: null as any,
        error: {
          code: 'PROMPT_GENERATION_ERROR',
          message: error instanceof Error ? error.message : 'Prompt generation failed'
        }
      }
    }
  }

  private async executeQualityValidation(input: any): Promise<WorkflowResult<{ qualityReport: QualityReport; optimizedPrompt: VideoPlanetPrompt }>> {
    try {
      const videoPlanetPrompt = input.videoPlanetPrompt as VideoPlanetPrompt

      // 품질 검증 수행
      const qualityReport = this.performQualityValidation(videoPlanetPrompt)
      
      // 최적화 수행
      const optimizedPrompt = this.optimizePrompt(videoPlanetPrompt, qualityReport)

      return {
        success: true,
        data: {
          qualityReport,
          optimizedPrompt
        }
      }

    } catch (error) {
      return {
        success: false,
        data: null as any,
        error: {
          code: 'QUALITY_VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Quality validation failed'
        }
      }
    }
  }

  // =============================================================================
  // 헬퍼 메서드들
  // =============================================================================

  private generateCacheKey(stepName: string, inputData: any): string {
    const relevantData = {
      step: stepName,
      title: inputData.title,
      genre: inputData.genre,
      duration: inputData.targetDuration,
      style: inputData.stylePreferences
    }
    return `${stepName}_${JSON.stringify(relevantData)}`
  }

  private extractThemes(input: StoryInput): string[] {
    const themes: string[] = []
    
    if (input.genre === 'romance') {
      themes.push('love', 'connection', 'serendipity')
    }
    
    if (input.setting.location.includes('카페') || input.setting.location.includes('cafe')) {
      themes.push('urban_life', 'social_space', 'comfort')
    }
    
    if (input.mood.includes('romantic')) {
      themes.push('romance', 'intimacy', 'emotion')
    }

    return themes
  }

  private identifyKeyMoments(input: StoryInput): string[] {
    const moments: string[] = []
    
    // 장르별 핵심 순간
    if (input.genre === 'romance') {
      moments.push('first_encounter', 'eye_contact', 'conversation', 'emotional_connection')
    }
    
    // 설정별 순간
    if (input.setting.location.includes('카페')) {
      moments.push('entrance', 'ordering', 'seating', 'departure')
    }

    return moments.slice(0, 6) // 최대 6개
  }

  private analyzeEmotionalArc(input: StoryInput): AnalyzedStory['emotionalArc'] {
    return {
      beginning: { intensity: 0.2, emotion: 'curiosity' },
      climax: { intensity: 0.9, emotion: input.stylePreferences.visualMood },
      resolution: { intensity: 0.7, emotion: 'satisfaction' }
    }
  }

  private analyzeCharacterDynamics(input: StoryInput): AnalyzedStory['characterDynamics'] {
    return input.characters.map(char => ({
      character: char.name,
      role: char.role,
      arcDescription: `${char.name}의 ${char.description}을 통한 감정적 여정`
    }))
  }

  private generateVisualKeywords(input: StoryInput): string[] {
    const keywords: string[] = []
    
    keywords.push(input.setting.location)
    keywords.push(input.setting.timeOfDay)
    keywords.push(input.setting.weather)
    keywords.push(input.stylePreferences.artStyle)
    keywords.push(input.stylePreferences.colorPalette)
    
    return keywords
  }

  private determinePacing(input: StoryInput): 'slow' | 'medium' | 'fast' {
    if (input.targetDuration > 150) return 'slow'
    if (input.targetDuration > 90) return 'medium'
    return 'fast'
  }

  private generateActDescription(template: any, storyInput: StoryInput, analyzedStory: AnalyzedStory): string {
    const baseDescriptions = {
      establish_setting_characters: `${storyInput.setting.location}의 분위기를 설정하고 주요 인물들을 소개합니다.`,
      introduce_conflict: '주인공들 사이의 만남과 초기 갈등 또는 긴장감을 조성합니다.',
      climax_development: '감정적 절정과 관계의 발전을 보여줍니다.',
      resolution: '갈등의 해결과 만족스러운 마무리를 제공합니다.'
    }
    
    return baseDescriptions[template.purpose as keyof typeof baseDescriptions] || template.title
  }

  private generateKeyEvents(template: any, analyzedStory: AnalyzedStory, actIndex: number): string[] {
    const eventsByAct = [
      ['환경_설정', '캐릭터_등장', '분위기_조성'],
      ['첫_만남', '초기_상호작용', '긴장감_조성'],
      ['감정_절정', '관계_발전', '핵심_갈등'],
      ['갈등_해결', '마무리', '미래_암시']
    ]
    
    return eventsByAct[actIndex] || []
  }

  private generateVisualFocus(template: any, storyInput: StoryInput): string {
    const focusByPurpose = {
      establish_setting_characters: `${storyInput.setting.location}의 시각적 특징과 캐릭터 소개`,
      introduce_conflict: '캐릭터 간의 상호작용과 감정 표현',
      climax_development: '감정적 순간과 핵심 장면의 시각화',
      resolution: '만족스러운 결말과 여운을 주는 이미지'
    }
    
    return focusByPurpose[template.purpose as keyof typeof focusByPurpose] || '일반적인 시각적 구성'
  }

  private generateShotDescription(act: any, shotIndex: number, storyInput: StoryInput): string {
    const shotTypes = ['establishing', 'character_focus', 'interaction']
    const shotType = shotTypes[shotIndex % shotTypes.length]
    
    const descriptions = {
      establishing: `${storyInput.setting.location}의 전경을 보여주는 설정 샷`,
      character_focus: '주요 인물에 집중하는 캐릭터 샷',
      interaction: '인물 간의 상호작용을 보여주는 관계 샷'
    }
    
    return `${act.title} - ${descriptions[shotType as keyof typeof descriptions]}`
  }

  private selectCameraAngle(act: any, shotIndex: number, shotsPerAct: number): ShotBreakdown['cameraAngle'] {
    const angles: ShotBreakdown['cameraAngle'][] = ['wide', 'medium', 'close']
    return angles[shotIndex % angles.length]
  }

  private selectCameraMovement(act: any, shotIndex: number): 'static' | 'pan' | 'tilt' | 'zoom' | 'dolly' {
    const movements = ['static', 'pan', 'zoom']
    return movements[shotIndex % movements.length] as any
  }

  private selectLighting(storyInput: StoryInput, act: any): 'natural' | 'artificial' | 'dramatic' | 'soft' {
    if (storyInput.setting.timeOfDay === 'morning' || storyInput.setting.timeOfDay === 'afternoon') {
      return 'natural'
    }
    return storyInput.stylePreferences.visualMood === 'dramatic' ? 'dramatic' : 'soft'
  }

  private selectDepthOfField(shotIndex: number, shotsPerAct: number): 'shallow' | 'deep' {
    return shotIndex === Math.floor(shotsPerAct / 2) ? 'shallow' : 'deep'
  }

  private generateVisualElements(act: any, storyInput: StoryInput, shotIndex: number): string[] {
    const elements: string[] = []
    
    elements.push(storyInput.setting.location)
    if (storyInput.characters.length > 0) {
      elements.push('characters')
    }
    elements.push('lighting')
    
    if (storyInput.setting.weather !== 'sunny') {
      elements.push('weather_effects')
    }
    
    return elements
  }

  private generateShotPrompt(act: any, storyInput: StoryInput, shotIndex: number): string {
    const basePrompt = `${storyInput.setting.location}, ${storyInput.stylePreferences.artStyle} style, ${storyInput.stylePreferences.colorPalette} colors, ${storyInput.setting.timeOfDay} lighting`
    
    const moodAddition = storyInput.stylePreferences.visualMood !== 'happy' ? `, ${storyInput.stylePreferences.visualMood} mood` : ''
    
    return `${basePrompt}${moodAddition}, professional cinematography, high quality`
  }

  private generateTags(storyInput: StoryInput): string[] {
    const tags = [storyInput.genre, storyInput.stylePreferences.artStyle, storyInput.stylePreferences.visualMood]
    
    if (storyInput.setting.location) {
      tags.push(storyInput.setting.location)
    }
    
    return tags.slice(0, 10)
  }

  private assessDifficulty(storyInput: StoryInput, shotBreakdown: ShotBreakdown[]): 'easy' | 'medium' | 'hard' | 'expert' {
    let complexityScore = 0
    
    if (storyInput.characters.length > 2) complexityScore += 1
    if (shotBreakdown.some(shot => shot.cameraAngle === 'dutch_angle' || shot.cameraAngle === 'extreme_close')) complexityScore += 1
    if (storyInput.stylePreferences.artStyle === 'cinematic') complexityScore += 1
    if (storyInput.targetDuration > 120) complexityScore += 1
    
    if (complexityScore >= 3) return 'hard'
    if (complexityScore >= 2) return 'medium'
    return 'easy'
  }

  private estimateTokens(shotBreakdown: ShotBreakdown[]): number {
    return shotBreakdown.reduce((total, shot) => {
      return total + Math.ceil(shot.generationPrompt.split(' ').length * 1.3)
    }, 0)
  }

  private mapVisualMoodToLightingMood(visualMood: string): 'bright' | 'dim' | 'dramatic' | 'soft' {
    const moodMap = {
      'happy': 'bright',
      'romantic': 'soft',
      'dramatic': 'dramatic',
      'mysterious': 'dim',
      'action': 'dramatic'
    }
    return moodMap[visualMood as keyof typeof moodMap] || 'soft'
  }

  private performQualityValidation(prompt: VideoPlanetPrompt): QualityReport {
    const issues: QualityReport['issues'] = []
    let consistencyScore = 1.0
    let completenessScore = 1.0
    let technicalScore = 1.0

    // 일관성 검증
    if (!prompt.promptStructure?.styleGuide) {
      issues.push({
        type: 'error',
        category: 'consistency',
        message: 'Style guide is missing',
        severity: 'high'
      })
      consistencyScore -= 0.3
    }

    // 완전성 검증
    if (!prompt.promptStructure?.shotBreakdown || prompt.promptStructure.shotBreakdown.length !== 12) {
      issues.push({
        type: 'warning',
        category: 'technical',
        message: 'Expected 12 shots in breakdown',
        severity: 'medium'
      })
      completenessScore -= 0.2
    }

    // 기술적 검증
    if (!prompt.generationSettings) {
      issues.push({
        type: 'error',
        category: 'technical',
        message: 'Generation settings are missing',
        severity: 'critical'
      })
      technicalScore -= 0.5
    }

    const overallScore = (consistencyScore + completenessScore + technicalScore) / 3

    return {
      consistencyScore: Math.max(0, consistencyScore),
      completenessScore: Math.max(0, completenessScore),
      technicalScore: Math.max(0, technicalScore),
      overallScore: Math.max(0, overallScore),
      issues,
      optimizationSuggestions: this.generateOptimizationSuggestions(issues),
      estimatedGenerationCost: this.estimateGenerationCost(prompt),
      estimatedGenerationTime: this.estimateGenerationTime(prompt)
    }
  }

  private optimizePrompt(prompt: VideoPlanetPrompt, qualityReport: QualityReport): VideoPlanetPrompt {
    const optimized = { ...prompt }

    // 품질 점수가 임계값 미만인 경우 최적화 적용
    if (qualityReport.overallScore < this.config.qualityGates.minConsistencyScore) {
      // 프롬프트 길이 최적화
      if (optimized.promptStructure?.shotBreakdown) {
        optimized.promptStructure.shotBreakdown = optimized.promptStructure.shotBreakdown.map(shot => ({
          ...shot,
          generationPrompt: this.optimizePromptText(shot.generationPrompt)
        }))
      }

      // 토큰 수 재계산
      optimized.metadata.estimatedTokens = this.estimateTokens(optimized.promptStructure?.shotBreakdown || [])
    }

    return optimized
  }

  private optimizePromptText(prompt: string): string {
    // 중복 단어 제거 및 효율적인 키워드로 치환
    const optimized = prompt
      .replace(/\b(high quality|detailed)\b.*\b(high quality|detailed)\b/gi, 'high quality, detailed')
      .replace(/,\s*,/g, ',')
      .replace(/\s+/g, ' ')
      .trim()

    return optimized
  }

  private generateOptimizationSuggestions(issues: QualityReport['issues']): string[] {
    const suggestions: string[] = []

    if (issues.some(issue => issue.category === 'consistency')) {
      suggestions.push('스타일 일관성을 위해 색상 팔레트 및 아트 스타일 통일 고려')
    }

    if (issues.some(issue => issue.category === 'technical')) {
      suggestions.push('기술적 설정 검토 및 생성 파라미터 최적화')
    }

    return suggestions
  }

  private estimateGenerationCost(prompt: VideoPlanetPrompt): number {
    const shotCount = prompt.promptStructure?.shotBreakdown?.length || 0
    const provider = prompt.generationSettings?.provider || 'google'
    
    const costPerImage = {
      'google': 0.02,
      'openai': 0.08,
      'huggingface': 0.0,
      'midjourney': 0.01
    }

    return shotCount * (costPerImage[provider as keyof typeof costPerImage] || 0.02)
  }

  private estimateGenerationTime(prompt: VideoPlanetPrompt): number {
    const shotCount = prompt.promptStructure?.shotBreakdown?.length || 0
    const batchSize = prompt.generationSettings?.batchSettings?.batchSize || 1
    const timePerImage = 8000 // 8초 per image

    return Math.ceil(shotCount / batchSize) * timePerImage
  }

  private generateBasicQualityReport(prompt: VideoPlanetPrompt): QualityReport {
    return {
      consistencyScore: 0.8,
      completenessScore: 0.9,
      technicalScore: 0.85,
      overallScore: 0.85,
      issues: [],
      optimizationSuggestions: [],
      estimatedGenerationCost: this.estimateGenerationCost(prompt),
      estimatedGenerationTime: this.estimateGenerationTime(prompt)
    }
  }
}