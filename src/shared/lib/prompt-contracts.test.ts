/**
 * 프롬프트 데이터 계약 테스트
 * TDD 원칙에 따른 실패 테스트 우선 작성
 */

import { describe, test, expect } from '@jest/globals'
import { z } from 'zod'
import { 
  videoPlanetPromptSchema,
  openAiPromptSchema,
  anthropicPromptSchema,
  promptExportPackageSchema,
  promptImportPackageSchema,
  PromptDataValidator,
  type VideoPlanetPrompt,
  type PromptExportPackage
} from './prompt-contracts'

describe('PromptDataValidator 테스트', () => {
  describe('VideoPlanet 프롬프트 스키마 검증', () => {
    test('유효한 VideoPlanet 프롬프트 검증 성공', () => {
      const validPrompt = {
        id: 'prompt_12345',
        projectId: 'project_abc123',
        version: '1.0.0',
        metadata: {
          title: '로맨틱 코미디 스토리보드',
          description: '카페에서 만나는 두 주인공의 첫 만남',
          category: 'storyboard',
          tags: ['romance', 'comedy', 'cafe'],
          difficulty: 'medium',
          estimatedTokens: 150
        },
        promptStructure: {
          storyActs: [
            {
              actNumber: 1,
              title: '만남',
              description: '주인공들이 카페에서 처음 만난다',
              duration: 30,
              keyMoments: ['카페 입장', '시선 교차', '첫 대화']
            }
          ],
          shotBreakdown: [
            {
              shotNumber: 1,
              description: '카페 전경을 보여주는 와이드 샷',
              cameraAngle: 'wide',
              duration: 5,
              visualElements: ['카페 인테리어', '따뜻한 조명'],
              generationPrompt: 'cozy cafe interior, warm lighting, wide shot'
            }
          ],
          styleGuide: {
            artStyle: 'cinematic',
            colorPalette: 'warm_tones',
            visualMood: 'romantic',
            characterConsistency: {
              enabled: true,
              referenceCharacters: ['protagonist_a', 'protagonist_b']
            }
          }
        },
        generationSettings: {
          provider: 'google',
          model: 'imagen-4.0-fast',
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
        },
        qualityAssurance: {
          validationRules: {
            minConsistencyScore: 0.75,
            maxRegenerationCount: 3,
            requiredElements: ['characters', 'background', 'lighting']
          },
          approvalWorkflow: {
            requiresManualReview: false,
            autoApproveThreshold: 0.85,
            reviewers: []
          }
        },
        compatibility: {
          openai: {
            model: 'dall-e-3',
            adaptedPrompt: 'A cozy cafe scene with romantic lighting...'
          },
          anthropic: {
            model: 'claude-3-sonnet',
            adaptedPrompt: 'Generate an image of a warm, inviting cafe...'
          }
        },
        usage: {
          createdBy: 'user_123',
          createdAt: '2025-01-15T10:30:00.000Z',
          lastUsedAt: '2025-01-15T11:45:00.000Z',
          usageCount: 5,
          averageGenerationTime: 8500
        },
        status: 'active'
      }

      const validation = PromptDataValidator.validateWithReport(
        videoPlanetPromptSchema,
        validPrompt
      )

      expect(validation.isValid).toBe(true)
      expect(validation.data).toBeDefined()
      expect(validation.errors).toHaveLength(0)
    })

    test('필수 필드 누락 시 검증 실패', () => {
      const invalidPrompt = {
        id: 'prompt_12345',
        // projectId 누락
        version: '1.0.0'
        // metadata, promptStructure 등 누락
      }

      const validation = PromptDataValidator.validateWithReport(
        videoPlanetPromptSchema,
        invalidPrompt
      )

      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
      expect(validation.errors.some(error => error.path.includes('projectId'))).toBe(true)
    })

    test('잘못된 ID 형식 시 검증 실패', () => {
      const invalidPrompt = {
        id: 'invalid-id-format', // 올바른 형식: prompt_xxxxx
        projectId: 'project_abc123',
        version: '1.0.0',
        metadata: {
          title: 'Test',
          category: 'storyboard' as const,
          tags: [],
          difficulty: 'easy' as const,
          estimatedTokens: 100
        }
      }

      const validation = PromptDataValidator.validateWithReport(
        videoPlanetPromptSchema,
        invalidPrompt
      )

      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(error => 
        error.path.includes('id') && error.message.includes('regex')
      )).toBe(true)
    })
  })

  describe('외부 도구 호환성 스키마 검증', () => {
    test('OpenAI 형식으로 변환 및 검증', () => {
      const openAiPrompt = {
        model: 'dall-e-3',
        prompt: 'A cinematic scene in a cozy cafe with warm lighting',
        size: '1792x1024',
        quality: 'hd',
        style: 'vivid',
        response_format: 'url',
        user: 'user_123'
      }

      const validation = PromptDataValidator.validateWithReport(
        openAiPromptSchema,
        openAiPrompt
      )

      expect(validation.isValid).toBe(true)
    })

    test('Anthropic 형식으로 변환 및 검증', () => {
      const anthropicPrompt = {
        model: 'claude-3-sonnet-20240229',
        messages: [
          {
            role: 'user',
            content: 'Generate an image description for a cozy cafe scene'
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      }

      const validation = PromptDataValidator.validateWithReport(
        anthropicPromptSchema,
        anthropicPrompt
      )

      expect(validation.isValid).toBe(true)
    })
  })

  describe('내보내기/가져오기 패키지 검증', () => {
    test('내보내기 패키지 검증 성공', () => {
      const exportPackage = {
        exportId: 'export_12345',
        version: '1.0.0',
        metadata: {
          title: 'My Prompts Collection',
          description: 'Collection of storyboard prompts',
          exportedBy: 'user_123',
          exportedAt: '2025-01-15T10:30:00.000Z',
          totalPrompts: 2,
          categories: ['storyboard', 'character']
        },
        prompts: [
          {
            id: 'prompt_1',
            projectId: 'project_abc123',
            version: '1.0.0',
            metadata: {
              title: 'Cafe Scene',
              category: 'storyboard' as const,
              tags: ['cafe', 'romance'],
              difficulty: 'medium' as const,
              estimatedTokens: 150
            }
          }
        ],
        compatibility: {
          formatVersion: '1.0.0',
          requiredFeatures: ['batch_generation', 'style_consistency'],
          supportedProviders: ['google', 'openai', 'huggingface']
        }
      }

      const validation = PromptDataValidator.validateWithReport(
        promptExportPackageSchema,
        exportPackage
      )

      expect(validation.isValid).toBe(true)
    })

    test('대용량 패키지 제한 검증', () => {
      const oversizedPackage = {
        exportId: 'export_12345',
        version: '1.0.0',
        metadata: {
          title: 'Large Collection',
          exportedBy: 'user_123',
          exportedAt: '2025-01-15T10:30:00.000Z',
          totalPrompts: 5000, // 최대 1000개 초과
          categories: []
        },
        prompts: [],
        compatibility: {
          formatVersion: '1.0.0',
          requiredFeatures: [],
          supportedProviders: ['google']
        }
      }

      const validation = PromptDataValidator.validateWithReport(
        promptExportPackageSchema,
        oversizedPackage
      )

      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(error => 
        error.message.includes('1000')
      )).toBe(true)
    })
  })

  describe('데이터 품질 및 성능 검증', () => {
    test('토큰 수 추정 정확성 검증', () => {
      const testPrompt: VideoPlanetPrompt = {
        id: 'prompt_token_test',
        projectId: 'project_test',
        version: '1.0.0',
        metadata: {
          title: 'Token Test',
          category: 'storyboard',
          tags: [],
          difficulty: 'easy',
          estimatedTokens: 50 // 실제보다 적게 설정
        },
        promptStructure: {
          storyActs: [],
          shotBreakdown: [
            {
              shotNumber: 1,
              description: 'This is a very long description that should exceed the estimated token count significantly and trigger validation warnings about token estimation accuracy',
              cameraAngle: 'wide',
              duration: 5,
              visualElements: [],
              generationPrompt: 'very detailed prompt with many descriptive words and complex scene elements'
            }
          ],
          styleGuide: {
            artStyle: 'photorealistic',
            colorPalette: 'natural',
            visualMood: 'dramatic'
          }
        }
      }

      const tokenAccuracy = PromptDataValidator.validateTokenEstimation(testPrompt)
      expect(tokenAccuracy.isAccurate).toBe(false)
      expect(tokenAccuracy.actualTokens).toBeGreaterThan(testPrompt.metadata.estimatedTokens)
    })

    test('성능 예산 검증', () => {
      const performanceBudget = {
        maxPrompts: 1000,
        maxTokensPerPrompt: 500,
        maxGenerationTime: 30000, // 30초
        maxBatchSize: 10
      }

      const testPrompt: VideoPlanetPrompt = {
        id: 'prompt_perf_test',
        projectId: 'project_test',
        version: '1.0.0',
        metadata: {
          title: 'Performance Test',
          category: 'storyboard',
          tags: [],
          difficulty: 'hard',
          estimatedTokens: 600 // 예산 초과
        },
        generationSettings: {
          provider: 'google',
          model: 'imagen-4.0-fast',
          parameters: {
            aspectRatio: '16:9',
            quality: 'ultra' // 고품질로 시간 증가
          },
          batchSettings: {
            enabled: true,
            batchSize: 15, // 예산 초과
            maxRetries: 3,
            timeoutMs: 45000 // 예산 초과
          }
        }
      }

      const budgetCheck = PromptDataValidator.validatePerformanceBudget(
        testPrompt, 
        performanceBudget
      )

      expect(budgetCheck.withinBudget).toBe(false)
      expect(budgetCheck.violations.length).toBeGreaterThan(0)
    })
  })

  describe('GDPR 및 데이터 보호 검증', () => {
    test('개인정보 포함 프롬프트 검증 실패', () => {
      const promptWithPII = {
        id: 'prompt_pii_test',
        projectId: 'project_test',
        version: '1.0.0',
        metadata: {
          title: 'Test with PII',
          category: 'storyboard' as const,
          tags: [],
          difficulty: 'easy' as const,
          estimatedTokens: 100
        },
        promptStructure: {
          shotBreakdown: [
            {
              shotNumber: 1,
              description: 'John Smith walking in front of 123 Main Street', // PII 포함
              cameraAngle: 'medium',
              duration: 5,
              visualElements: [],
              generationPrompt: 'person named John Smith at specific address'
            }
          ]
        }
      }

      const gdprCheck = PromptDataValidator.validateGDPRCompliance(promptWithPII)
      expect(gdprCheck.compliant).toBe(false)
      expect(gdprCheck.violations.length).toBeGreaterThan(0)
    })
  })
})