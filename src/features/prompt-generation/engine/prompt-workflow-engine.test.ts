/**
 * 프롬프트 생성 워크플로우 엔진 테스트
 * TDD 원칙에 따른 실패 테스트 우선 작성
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import {
  PromptWorkflowEngine,
  type StoryInput,
  type WorkflowConfig,
  type GenerationStep,
  type WorkflowResult
} from './prompt-workflow-engine'
import { VideoPlanetPrompt } from '@/shared/lib/prompt-contracts'

describe('PromptWorkflowEngine 기본 기능 테스트', () => {
  let engine: PromptWorkflowEngine
  let mockConfig: WorkflowConfig

  beforeEach(() => {
    mockConfig = {
      steps: {
        storyAnalysis: { enabled: true, timeout: 30000 },
        fourActGeneration: { enabled: true, timeout: 45000 },
        shotBreakdown: { enabled: true, timeout: 60000 },
        promptGeneration: { enabled: true, timeout: 30000 },
        qualityValidation: { enabled: true, timeout: 15000 }
      },
      batchProcessing: {
        enabled: true,
        batchSize: 4,
        parallelSteps: true,
        failureHandling: 'continue_on_error'
      },
      qualityGates: {
        minConsistencyScore: 0.75,
        maxRegenerationAttempts: 3,
        requireManualApproval: false
      },
      optimization: {
        cacheResults: true,
        reuseGeneratedContent: true,
        costOptimization: true
      }
    }
    
    engine = new PromptWorkflowEngine(mockConfig)
  })

  describe('워크플로우 단계별 테스트', () => {
    const sampleStoryInput: StoryInput = {
      id: 'story_test123',
      title: '카페에서의 운명적 만남',
      description: '바쁜 도시의 작은 카페에서 우연히 마주친 두 사람의 첫 만남과 로맨틱한 순간들',
      genre: 'romance',
      targetDuration: 180, // 3분
      mood: 'warm_romantic',
      setting: {
        location: '도시 카페',
        timeOfDay: 'afternoon',
        weather: 'sunny',
        atmosphere: 'cozy_intimate'
      },
      characters: [
        {
          name: '지민',
          role: 'female_lead',
          description: '독립적이고 창의적인 그래픽 디자이너',
          visualStyle: 'casual_chic',
          age: 28
        },
        {
          name: '준호',
          role: 'male_lead', 
          description: '따뜻한 성격의 카페 사장',
          visualStyle: 'casual_warm',
          age: 30
        }
      ],
      stylePreferences: {
        artStyle: 'cinematic',
        colorPalette: 'warm_tones',
        visualMood: 'romantic',
        aspectRatio: '16:9'
      }
    }

    test('1단계: 스토리 분석 및 구조화', async () => {
      const result = await engine.executeStep('storyAnalysis', sampleStoryInput)
      
      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('analyzedStory')
      expect(result.data.analyzedStory).toHaveProperty('themes')
      expect(result.data.analyzedStory).toHaveProperty('keyMoments')
      expect(result.data.analyzedStory).toHaveProperty('emotionalArc')
      
      // 스토리 분석 품질 검증
      expect(result.data.analyzedStory.themes.length).toBeGreaterThan(0)
      expect(result.data.analyzedStory.keyMoments.length).toBeGreaterThanOrEqual(3)
      expect(result.data.analyzedStory.emotionalArc).toHaveProperty('beginning')
      expect(result.data.analyzedStory.emotionalArc).toHaveProperty('climax')
      expect(result.data.analyzedStory.emotionalArc).toHaveProperty('resolution')
    })

    test('2단계: 4막 구조 생성', async () => {
      // 선행 단계 완료 상태 모킹
      const analyzedStory = {
        themes: ['love_at_first_sight', 'serendipity', 'urban_romance'],
        keyMoments: ['cafe_entrance', 'eye_contact', 'conversation', 'phone_number_exchange'],
        emotionalArc: {
          beginning: { intensity: 0.2, emotion: 'curiosity' },
          climax: { intensity: 0.9, emotion: 'romantic_tension' },
          resolution: { intensity: 0.7, emotion: 'hopeful_anticipation' }
        }
      }

      const result = await engine.executeStep('fourActGeneration', {
        ...sampleStoryInput,
        analyzedStory
      })

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('fourActStructure')
      expect(result.data.fourActStructure.acts).toHaveLength(4)
      
      // 각 막의 구조 검증
      result.data.fourActStructure.acts.forEach((act: any, index: number) => {
        expect(act).toHaveProperty('id')
        expect(act).toHaveProperty('title')
        expect(act).toHaveProperty('description')
        expect(act).toHaveProperty('duration')
        expect(act.order).toBe(index + 1)
        expect(act.duration).toBeGreaterThan(0)
      })

      // 총 시간이 목표와 일치하는지 확인
      const totalDuration = result.data.fourActStructure.acts.reduce(
        (sum: number, act: any) => sum + act.duration, 0
      )
      expect(totalDuration).toBe(sampleStoryInput.targetDuration)
    })

    test('3단계: 12샷 상세 계획 생성', async () => {
      const fourActStructure = {
        acts: [
          { id: 'act_1', title: '도입', description: '카페 분위기와 캐릭터 소개', duration: 45, order: 1 },
          { id: 'act_2', title: '만남', description: '두 주인공의 첫 만남', duration: 60, order: 2 },
          { id: 'act_3', title: '발전', description: '대화와 관계 발전', duration: 60, order: 3 },
          { id: 'act_4', title: '결말', description: '연락처 교환과 희망찬 마무리', duration: 15, order: 4 }
        ]
      }

      const result = await engine.executeStep('shotBreakdown', {
        ...sampleStoryInput,
        fourActStructure
      })

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('shotBreakdown')
      expect(result.data.shotBreakdown).toHaveLength(12)

      // 각 샷의 구조 검증
      result.data.shotBreakdown.forEach((shot: any, index: number) => {
        expect(shot).toHaveProperty('shotNumber', index + 1)
        expect(shot).toHaveProperty('description')
        expect(shot).toHaveProperty('cameraAngle')
        expect(shot).toHaveProperty('duration')
        expect(shot).toHaveProperty('visualElements')
        expect(shot).toHaveProperty('generationPrompt')
        expect(shot.visualElements).toBeInstanceOf(Array)
        expect(shot.generationPrompt.length).toBeGreaterThan(10)
      })

      // 샷별 시간 배분 검증
      const totalShotDuration = result.data.shotBreakdown.reduce(
        (sum: number, shot: any) => sum + shot.duration, 0
      )
      expect(totalShotDuration).toBeCloseTo(sampleStoryInput.targetDuration, 5)
    })

    test('4단계: VideoPlanet 프롬프트 생성', async () => {
      const shotBreakdown = Array(12).fill(null).map((_, index) => ({
        shotNumber: index + 1,
        description: `샷 ${index + 1}에 대한 상세 설명`,
        cameraAngle: index % 3 === 0 ? 'wide' : index % 3 === 1 ? 'medium' : 'close',
        duration: Math.floor(sampleStoryInput.targetDuration / 12),
        visualElements: ['cafe_interior', 'characters', 'natural_lighting'],
        generationPrompt: `detailed prompt for shot ${index + 1} in cinematic style`
      }))

      const result = await engine.executeStep('promptGeneration', {
        ...sampleStoryInput,
        shotBreakdown
      })

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('videoPlanetPrompt')
      
      const prompt: VideoPlanetPrompt = result.data.videoPlanetPrompt
      
      // VideoPlanet 프롬프트 구조 검증
      expect(prompt.id).toMatch(/^prompt_[a-zA-Z0-9]+$/)
      expect(prompt.projectId).toMatch(/^project_[a-zA-Z0-9]+$/)
      expect(prompt.version).toBe('1.0.0')
      
      expect(prompt.metadata.title).toBe(sampleStoryInput.title)
      expect(prompt.metadata.category).toBe('storyboard')
      expect(prompt.metadata.estimatedTokens).toBeGreaterThan(0)
      
      expect(prompt.promptStructure?.shotBreakdown).toHaveLength(12)
      expect(prompt.promptStructure?.styleGuide).toBeDefined()
      expect(prompt.promptStructure?.styleGuide?.artStyle).toBe('cinematic')
    })

    test('5단계: 품질 검증 및 최적화', async () => {
      const samplePrompt: VideoPlanetPrompt = {
        id: 'prompt_test',
        projectId: 'project_test',
        version: '1.0.0',
        metadata: {
          title: sampleStoryInput.title,
          category: 'storyboard',
          tags: ['romance', 'cafe'],
          difficulty: 'medium',
          estimatedTokens: 500
        },
        promptStructure: {
          shotBreakdown: Array(12).fill(null).map((_, i) => ({
            shotNumber: i + 1,
            description: `Shot ${i + 1}`,
            cameraAngle: 'medium',
            duration: 15,
            visualElements: [],
            generationPrompt: `prompt ${i + 1}`
          })),
          styleGuide: {
            artStyle: 'cinematic',
            colorPalette: 'warm_tones',
            visualMood: 'romantic'
          }
        }
      }

      const result = await engine.executeStep('qualityValidation', {
        ...sampleStoryInput,
        videoPlanetPrompt: samplePrompt
      })

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('qualityReport')
      expect(result.data).toHaveProperty('optimizedPrompt')
      
      const qualityReport = result.data.qualityReport
      expect(qualityReport).toHaveProperty('consistencyScore')
      expect(qualityReport).toHaveProperty('completenessScore')
      expect(qualityReport).toHaveProperty('optimizationSuggestions')
      expect(qualityReport.consistencyScore).toBeGreaterThanOrEqual(mockConfig.qualityGates.minConsistencyScore)
    })
  })

  describe('완전한 워크플로우 실행 테스트', () => {
    test('전체 파이프라인 실행 (성공 케이스)', async () => {
      const sampleStoryInput: StoryInput = {
        id: 'story_full_test',
        title: '서점에서의 우연한 만남',
        description: '비 오는 날 작은 독립 서점에서 같은 책을 집어든 두 사람의 로맨틱한 만남',
        genre: 'romance',
        targetDuration: 120,
        mood: 'cozy_romantic',
        setting: {
          location: '독립서점',
          timeOfDay: 'evening',
          weather: 'rainy',
          atmosphere: 'intimate_quiet'
        },
        characters: [
          {
            name: '수진',
            role: 'female_lead',
            description: '문학을 사랑하는 번역가',
            visualStyle: 'intellectual_chic'
          },
          {
            name: '민수',
            role: 'male_lead',
            description: '조용한 성격의 소설가',
            visualStyle: 'casual_artistic'
          }
        ],
        stylePreferences: {
          artStyle: 'cinematic',
          colorPalette: 'muted',
          visualMood: 'romantic',
          aspectRatio: '16:9'
        }
      }

      const result = await engine.executeFullWorkflow(sampleStoryInput)

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('finalPrompt')
      expect(result.data).toHaveProperty('executionLog')
      expect(result.data).toHaveProperty('qualityMetrics')
      
      const finalPrompt: VideoPlanetPrompt = result.data.finalPrompt
      expect(finalPrompt.metadata.title).toBe(sampleStoryInput.title)
      expect(finalPrompt.promptStructure?.shotBreakdown).toHaveLength(12)
      
      // 실행 로그 검증
      const executionLog = result.data.executionLog
      expect(executionLog.steps).toHaveLength(5)
      expect(executionLog.totalExecutionTime).toBeGreaterThan(0)
      expect(executionLog.stepsCompleted).toBe(5)
    })

    test('배치 처리 모드 테스트', async () => {
      const storyInputs: StoryInput[] = [
        {
          id: 'story_batch_1',
          title: '카페 로맨스 1',
          description: '첫 번째 카페 이야기',
          genre: 'romance',
          targetDuration: 90,
          mood: 'warm_romantic',
          setting: { location: 'cafe', timeOfDay: 'morning', weather: 'sunny', atmosphere: 'bright' },
          characters: [],
          stylePreferences: { artStyle: 'cinematic', colorPalette: 'warm_tones', visualMood: 'romantic', aspectRatio: '16:9' }
        },
        {
          id: 'story_batch_2',
          title: '카페 로맨스 2',
          description: '두 번째 카페 이야기',
          genre: 'romance',
          targetDuration: 90,
          mood: 'dreamy_romantic',
          setting: { location: 'cafe', timeOfDay: 'evening', weather: 'cloudy', atmosphere: 'cozy' },
          characters: [],
          stylePreferences: { artStyle: 'cinematic', colorPalette: 'cool_tones', visualMood: 'romantic', aspectRatio: '16:9' }
        }
      ]

      const results = await engine.executeBatchWorkflow(storyInputs)

      expect(results).toHaveLength(2)
      results.forEach((result, index) => {
        expect(result.success).toBe(true)
        expect(result.data.finalPrompt.metadata.title).toBe(storyInputs[index].title)
      })
    })
  })

  describe('오류 처리 및 복구 테스트', () => {
    test('단일 단계 실패 시 복구', async () => {
      // API 호출 실패 시뮬레이션
      const faultyInput = {
        id: 'story_faulty',
        title: '', // 빈 제목으로 검증 실패 유도
        description: 'test',
        genre: 'romance' as const,
        targetDuration: -1, // 잘못된 지속 시간
        mood: 'test',
        setting: {
          location: 'test',
          timeOfDay: 'morning' as const,
          weather: 'sunny' as const,
          atmosphere: 'test'
        },
        characters: [],
        stylePreferences: {
          artStyle: 'cinematic' as const,
          colorPalette: 'warm_tones' as const,
          visualMood: 'romantic' as const,
          aspectRatio: '16:9' as const
        }
      }

      const result = await engine.executeStep('storyAnalysis', faultyInput)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(result.retryCount).toBe(0)
    })

    test('자동 재시도 메커니즘', async () => {
      // 네트워크 타임아웃 시뮬레이션
      const timeoutConfig: WorkflowConfig = {
        ...mockConfig,
        steps: {
          ...mockConfig.steps,
          storyAnalysis: { enabled: true, timeout: 1 } // 매우 짧은 타임아웃
        }
      }

      const timeoutEngine = new PromptWorkflowEngine(timeoutConfig)
      
      const validInput: StoryInput = {
        id: 'story_timeout_test',
        title: '타임아웃 테스트',
        description: '타임아웃 처리 테스트용 스토리',
        genre: 'romance',
        targetDuration: 120,
        mood: 'romantic',
        setting: {
          location: 'test',
          timeOfDay: 'morning',
          weather: 'sunny',
          atmosphere: 'test'
        },
        characters: [],
        stylePreferences: {
          artStyle: 'cinematic',
          colorPalette: 'warm_tones',
          visualMood: 'romantic',
          aspectRatio: '16:9'
        }
      }

      const result = await timeoutEngine.executeStep('storyAnalysis', validInput)

      // 타임아웃으로 인한 실패 예상
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('TIMEOUT_ERROR')
      expect(result.retryCount).toBeGreaterThan(0)
    })
  })

  describe('성능 및 최적화 테스트', () => {
    test('캐싱 메커니즘 동작 확인', async () => {
      const testInput: StoryInput = {
        id: 'story_cache_test',
        title: '캐시 테스트',
        description: '동일한 입력에 대한 캐싱 테스트',
        genre: 'romance',
        targetDuration: 60,
        mood: 'romantic',
        setting: {
          location: 'cafe',
          timeOfDay: 'afternoon',
          weather: 'sunny',
          atmosphere: 'cozy'
        },
        characters: [],
        stylePreferences: {
          artStyle: 'cinematic',
          colorPalette: 'warm_tones',
          visualMood: 'romantic',
          aspectRatio: '16:9'
        }
      }

      // 첫 번째 실행
      const firstRun = await engine.executeStep('storyAnalysis', testInput)
      const firstExecutionTime = firstRun.executionTime || 0

      // 두 번째 실행 (캐시에서 가져와야 함)
      const secondRun = await engine.executeStep('storyAnalysis', testInput)
      const secondExecutionTime = secondRun.executionTime || 0

      expect(firstRun.success).toBe(true)
      expect(secondRun.success).toBe(true)
      expect(secondExecutionTime).toBeLessThan(firstExecutionTime) // 캐시로 인한 성능 향상
      expect(secondRun.fromCache).toBe(true)
    })

    test('병렬 처리 성능', async () => {
      const parallelInputs = Array(5).fill(null).map((_, index) => ({
        id: `story_parallel_${index}`,
        title: `병렬 테스트 ${index}`,
        description: `병렬 처리 테스트용 스토리 ${index}`,
        genre: 'romance' as const,
        targetDuration: 60,
        mood: 'romantic',
        setting: {
          location: 'cafe',
          timeOfDay: 'afternoon' as const,
          weather: 'sunny' as const,
          atmosphere: 'cozy'
        },
        characters: [],
        stylePreferences: {
          artStyle: 'cinematic' as const,
          colorPalette: 'warm_tones' as const,
          visualMood: 'romantic' as const,
          aspectRatio: '16:9' as const
        }
      }))

      const startTime = performance.now()
      const results = await engine.executeBatchWorkflow(parallelInputs)
      const endTime = performance.now()
      const totalTime = endTime - startTime

      expect(results).toHaveLength(5)
      expect(results.every(r => r.success)).toBe(true)
      expect(totalTime).toBeLessThan(30000) // 30초 이내 완료
    })
  })
})