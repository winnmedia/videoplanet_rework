/**
 * 프롬프트 어댑터 테스트
 * TDD 원칙에 따른 외부 도구 호환성 테스트
 */

import { describe, test, expect } from '@jest/globals'
import {
  PromptAdapter,
  OpenAiAdapter,
  AnthropicAdapter,
  HuggingFaceAdapter,
  MidjourneyAdapter,
  type VideoPlanetPrompt
} from './prompt-adapters'

describe('PromptAdapter 기본 기능 테스트', () => {
  const samplePrompt: VideoPlanetPrompt = {
    id: 'prompt_test123',
    projectId: 'project_abc456',
    version: '1.0.0',
    metadata: {
      title: '카페 로맨스 씬',
      description: '따뜻한 카페에서 벌어지는 로맨틱한 첫 만남',
      category: 'storyboard',
      tags: ['romance', 'cafe', 'meeting'],
      difficulty: 'medium',
      estimatedTokens: 180
    },
    promptStructure: {
      shotBreakdown: [
        {
          shotNumber: 1,
          description: '카페 전경을 보여주는 와이드 샷, 따뜻한 조명과 아늑한 분위기',
          cameraAngle: 'wide',
          duration: 5,
          visualElements: ['wooden_tables', 'warm_lighting', 'coffee_machines', 'large_windows'],
          generationPrompt: 'cozy cafe interior, warm golden lighting, wooden tables, large windows with natural light, coffee bar in background, inviting atmosphere'
        },
        {
          shotNumber: 2,
          description: '여주인공이 카페에 들어오는 미디움 샷',
          cameraAngle: 'medium',
          duration: 3,
          visualElements: ['female_protagonist', 'cafe_door', 'entrance'],
          generationPrompt: 'young woman entering a cozy cafe, medium shot, natural lighting from door, casual elegant style, warm colors'
        }
      ],
      styleGuide: {
        artStyle: 'cinematic',
        colorPalette: 'warm_tones',
        visualMood: 'romantic',
        characterConsistency: {
          enabled: true,
          referenceCharacters: ['female_lead', 'male_lead'],
          consistencyStrength: 0.85
        }
      }
    },
    generationSettings: {
      provider: 'google',
      model: 'imagen-4.0-fast-generate-preview-06-06',
      parameters: {
        aspectRatio: '16:9',
        quality: 'high',
        stylization: 0.8,
        coherence: 0.9
      },
      batchSettings: {
        enabled: true,
        batchSize: 4,
        maxRetries: 3,
        timeoutMs: 30000
      }
    }
  }

  describe('OpenAI 어댑터 테스트', () => {
    test('VideoPlanet 프롬프트를 OpenAI DALL-E 형식으로 변환', () => {
      const adapter = new OpenAiAdapter()
      const converted = adapter.convertFromVideoPlanet(samplePrompt, {
        targetModel: 'dall-e-3',
        includeStyleInstructions: true,
        maxPromptLength: 4000
      })

      expect(converted).toBeDefined()
      expect(converted.model).toBe('dall-e-3')
      expect(converted.prompt.length).toBeLessThanOrEqual(4000)
      expect(converted.prompt).toContain('cinematic')
      expect(converted.prompt).toContain('warm')
      expect(converted.size).toBe('1792x1024') // 16:9 비율
      expect(converted.quality).toBe('hd')
      expect(converted.style).toBe('vivid')
    })

    test('배치 프롬프트 변환 처리', () => {
      const adapter = new OpenAiAdapter()
      const batchConverted = adapter.convertBatch(samplePrompt, {
        targetModel: 'dall-e-3',
        individualShots: true
      })

      expect(batchConverted).toHaveLength(2) // 2개 샷
      expect(batchConverted[0].prompt).toContain('cozy cafe interior')
      expect(batchConverted[1].prompt).toContain('young woman entering')
      
      // 각 프롬프트가 스타일 일관성 유지
      batchConverted.forEach(prompt => {
        expect(prompt.prompt).toContain('cinematic')
        expect(prompt.prompt).toContain('warm')
      })
    })

    test('프롬프트 길이 제한 처리', () => {
      const longPrompt = { 
        ...samplePrompt,
        promptStructure: {
          ...samplePrompt.promptStructure!,
          shotBreakdown: [{
            ...samplePrompt.promptStructure!.shotBreakdown[0],
            generationPrompt: 'a'.repeat(5000) // 매우 긴 프롬프트
          }]
        }
      }

      const adapter = new OpenAiAdapter()
      const converted = adapter.convertFromVideoPlanet(longPrompt, {
        targetModel: 'dall-e-3',
        maxPromptLength: 1000
      })

      expect(converted.prompt.length).toBeLessThanOrEqual(1000)
      expect(converted.prompt).toContain('...') // 잘린 표시
    })
  })

  describe('Anthropic 어댑터 테스트', () => {
    test('VideoPlanet 프롬프트를 Anthropic Claude 형식으로 변환', () => {
      const adapter = new AnthropicAdapter()
      const converted = adapter.convertFromVideoPlanet(samplePrompt, {
        targetModel: 'claude-3-sonnet-20240229',
        includeAnalysis: true,
        responseFormat: 'detailed_description'
      })

      expect(converted.model).toBe('claude-3-sonnet-20240229')
      expect(converted.messages).toHaveLength(1)
      expect(converted.messages[0].role).toBe('user')
      expect(converted.messages[0].content).toContain('Generate detailed image descriptions')
      expect(converted.max_tokens).toBeGreaterThan(500)
      expect(converted.temperature).toBeGreaterThan(0)
    })

    test('시스템 프롬프트 포함 변환', () => {
      const adapter = new AnthropicAdapter()
      const converted = adapter.convertFromVideoPlanet(samplePrompt, {
        includeSystemPrompt: true,
        systemRole: 'expert_cinematographer'
      })

      expect(converted.system).toBeDefined()
      expect(converted.system).toContain('cinematographer')
      expect(converted.system).toContain('visual storytelling')
    })
  })

  describe('HuggingFace 어댑터 테스트', () => {
    test('VideoPlanet 프롬프트를 HuggingFace 형식으로 변환', () => {
      const adapter = new HuggingFaceAdapter()
      const converted = adapter.convertFromVideoPlanet(samplePrompt, {
        targetModel: 'stabilityai/stable-diffusion-xl-base-1.0',
        optimizeForModel: true,
        includeNegativePrompt: true
      })

      expect(converted.inputs).toBeDefined()
      expect(converted.inputs.length).toBeGreaterThan(0)
      expect(converted.parameters).toBeDefined()
      expect(converted.parameters?.width).toBe(1344) // 16:9 비율 최적화
      expect(converted.parameters?.height).toBe(768)
      expect(converted.parameters?.negative_prompt).toContain('low quality')
    })

    test('모델별 최적화 파라미터 적용', () => {
      const adapter = new HuggingFaceAdapter()
      
      // Stable Diffusion XL 최적화
      const sdxlConverted = adapter.convertFromVideoPlanet(samplePrompt, {
        targetModel: 'stabilityai/stable-diffusion-xl-base-1.0',
        optimizeForModel: true
      })

      expect(sdxlConverted.parameters?.num_inference_steps).toBe(25) // SDXL 최적값
      expect(sdxlConverted.parameters?.guidance_scale).toBe(7.5)

      // Stable Diffusion 2.1 최적화
      const sd21Converted = adapter.convertFromVideoPlanet(samplePrompt, {
        targetModel: 'stabilityai/stable-diffusion-2-1',
        optimizeForModel: true
      })

      expect(sd21Converted.parameters?.num_inference_steps).toBe(20) // SD 2.1 최적값
      expect(sd21Converted.parameters?.guidance_scale).toBe(10.0)
    })
  })

  describe('Midjourney 어댑터 테스트', () => {
    test('VideoPlanet 프롬프트를 Midjourney 형식으로 변환', () => {
      const adapter = new MidjourneyAdapter()
      const converted = adapter.convertFromVideoPlanet(samplePrompt, {
        version: '6.0',
        includeParameters: true,
        styleIntensity: 'high'
      })

      expect(converted.adaptedPrompt).toBeDefined()
      expect(converted.parameters).toContain('--ar 16:9')
      expect(converted.parameters).toContain('--style')
      expect(converted.parameters).toContain('--quality')
      expect(converted.version).toBe('6.0')
    })

    test('Midjourney 파라미터 최적화', () => {
      const adapter = new MidjourneyAdapter()
      const converted = adapter.convertFromVideoPlanet(samplePrompt, {
        optimizeForCinematic: true,
        enhanceRealism: true
      })

      expect(converted.parameters).toContain('--style raw')
      expect(converted.parameters).toContain('--stylize 250')
      expect(converted.adaptedPrompt).toContain('hyperrealistic')
      expect(converted.adaptedPrompt).toContain('cinematic lighting')
    })
  })

  describe('역변환 테스트', () => {
    test('OpenAI 응답을 VideoPlanet 형식으로 역변환', () => {
      const adapter = new OpenAiAdapter()
      const openAiResponse = {
        model: 'dall-e-3',
        prompt: 'cozy cafe interior with warm lighting, cinematic style',
        size: '1792x1024' as const,
        quality: 'hd' as const,
        style: 'vivid' as const,
        response_format: 'url' as const
      }

      const converted = adapter.convertToVideoPlanet(openAiResponse, {
        generateMetadata: true,
        inferStructure: true
      })

      expect(converted.metadata.title).toBeDefined()
      expect(converted.metadata.category).toBe('storyboard')
      expect(converted.metadata.estimatedTokens).toBeGreaterThan(0)
      expect(converted.promptStructure?.styleGuide?.artStyle).toBe('cinematic')
      expect(converted.generationSettings?.parameters?.aspectRatio).toBe('16:9')
    })
  })

  describe('호환성 매트릭스 테스트', () => {
    test('기능 호환성 확인', () => {
      const adapter = new PromptAdapter()
      
      const compatibility = adapter.checkCompatibility(samplePrompt, [
        'openai', 'anthropic', 'huggingface', 'midjourney'
      ])

      expect(compatibility.openai.supported).toBe(true)
      expect(compatibility.anthropic.supported).toBe(true)
      expect(compatibility.huggingface.supported).toBe(true)
      expect(compatibility.midjourney.supported).toBe(true)

      // 캐릭터 일관성 기능은 일부 플랫폼에서 제한
      expect(compatibility.openai.limitations).toContain('character_consistency')
      expect(compatibility.anthropic.limitations).toContain('batch_generation')
    })

    test('프롬프트 복잡성에 따른 호환성 변화', () => {
      const complexPrompt = {
        ...samplePrompt,
        promptStructure: {
          ...samplePrompt.promptStructure!,
          shotBreakdown: Array(15).fill(null).map((_, i) => ({
            shotNumber: i + 1,
            description: `Complex shot ${i + 1} with multiple elements`,
            cameraAngle: 'wide' as const,
            duration: 5,
            visualElements: ['element1', 'element2', 'element3'],
            generationPrompt: `Complex generation prompt for shot ${i + 1}`
          }))
        }
      }

      const adapter = new PromptAdapter()
      const compatibility = adapter.checkCompatibility(complexPrompt, ['openai'])

      expect(compatibility.openai.limitations).toContain('batch_size_limit')
      expect(compatibility.openai.recommendedSplitting).toBe(true)
    })
  })

  describe('데이터 무결성 검증', () => {
    test('변환 과정에서 데이터 손실 검증', () => {
      const adapter = new OpenAiAdapter()
      const converted = adapter.convertFromVideoPlanet(samplePrompt)
      const reconverted = adapter.convertToVideoPlanet(converted, { 
        preserveOriginalData: true 
      })

      // 핵심 정보 보존 확인
      expect(reconverted.metadata.category).toBe(samplePrompt.metadata.category)
      expect(reconverted.promptStructure?.styleGuide?.artStyle).toBe(
        samplePrompt.promptStructure?.styleGuide?.artStyle
      )
    })

    test('라운드트립 변환 정확성', () => {
      const adapters = [
        new OpenAiAdapter(),
        new AnthropicAdapter(),
        new HuggingFaceAdapter()
      ]

      adapters.forEach(adapter => {
        const converted = (adapter as any).convertFromVideoPlanet(samplePrompt)
        const reconverted = (adapter as any).convertToVideoPlanet(converted, {
          inferFromContent: true
        })

        expect(reconverted.metadata.category).toBe(samplePrompt.metadata.category)
        expect(reconverted.generationSettings?.parameters?.aspectRatio).toBe(
          samplePrompt.generationSettings?.parameters?.aspectRatio
        )
      })
    })
  })

  describe('성능 및 최적화 테스트', () => {
    test('대용량 배치 변환 성능', () => {
      const largeBatch = Array(100).fill(samplePrompt)
      const adapter = new OpenAiAdapter()
      
      const startTime = performance.now()
      const results = adapter.convertBatchFromVideoPlanet(largeBatch)
      const endTime = performance.now()

      expect(results).toHaveLength(100)
      expect(endTime - startTime).toBeLessThan(1000) // 1초 이내
    })

    test('메모리 사용량 최적화', () => {
      const adapter = new PromptAdapter()
      
      // 메모리 사용량 측정 (개념적)
      const memoryBefore = (process as any).memoryUsage?.().heapUsed || 0
      
      const largePrompts = Array(1000).fill(samplePrompt)
      adapter.convertBatchToMultipleFormats(largePrompts, ['openai', 'anthropic'])
      
      const memoryAfter = (process as any).memoryUsage?.().heapUsed || 0
      const memoryGrowth = memoryAfter - memoryBefore
      
      // 메모리 증가량이 합리적인 범위 내인지 확인
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024) // 100MB 미만
    })
  })
})