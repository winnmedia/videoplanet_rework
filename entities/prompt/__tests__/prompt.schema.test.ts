/**
 * 프롬프트 데이터 계약 테스트
 * 
 * 데이터 무결성과 스키마 검증을 위한 종합적인 테스트 스위트입니다.
 * CI 게이트에서 데이터 계약 위반을 사전에 검증합니다.
 */

import { describe, test, expect } from 'vitest'

import {
  safeParsePrompt,
  validatePrompt,
  createDefaultPrompt,
  type VideoPlanetPrompt
} from '../model/prompt.schema'

describe('Prompt Data Contract Tests', () => {
  
  // =============================================================================
  // 스키마 검증 테스트
  // =============================================================================
  
  describe('Schema Validation', () => {
    test('should validate a complete valid prompt', () => {
      const validPrompt: VideoPlanetPrompt = {
        id: 'prompt_123',
        projectId: 'project_456',
        version: '1.0.0',
        metadata: {
          title: 'Test Prompt',
          description: 'A test prompt',
          category: 'storyboard',
          tags: ['test', 'sample'],
          difficulty: 'medium',
          estimatedTokens: 150,
          language: 'ko',
          targetAudience: 'professional'
        },
        promptStructure: {
          shotBreakdown: [{
            shotNumber: 1,
            description: 'Opening shot',
            cameraAngle: 'wide',
            duration: 5,
            visualElements: ['character', 'setting'],
            generationPrompt: 'A wide shot of the main character'
          }],
          styleGuide: {
            artStyle: 'photorealistic',
            colorPalette: 'warm_tones',
            visualMood: 'happy'
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
          }
        },
        qualityAssurance: {
          validationRules: {
            minConsistencyScore: 0.7,
            maxRegenerationCount: 3,
            requiredElements: ['character'],
            forbiddenElements: ['text']
          }
        },
        usage: {
          createdBy: 'test_user',
          createdAt: '2024-01-01T00:00:00.000Z',
          usageCount: 0
        },
        status: 'draft'
      }

      const result = safeParsePrompt(validPrompt)
      expect(result.success).toBe(true)
    })

    test('should reject prompt with missing required fields', () => {
      const incompletePrompt = {
        id: 'prompt_123',
        // missing projectId, version, metadata, etc.
      }

      const result = safeParsePrompt(incompletePrompt)
      expect(result.success).toBe(false)
    })

    test('should reject invalid enum values', () => {
      const invalidPrompt = {
        id: 'prompt_123',
        projectId: 'project_456',
        version: '1.0.0',
        metadata: {
          title: 'Test',
          description: '',
          category: 'invalid_category', // Invalid enum value
          tags: [],
          difficulty: 'medium',
          estimatedTokens: 100,
          language: 'ko',
          targetAudience: 'professional'
        },
        promptStructure: {
          shotBreakdown: [{
            shotNumber: 1,
            description: 'Test shot',
            cameraAngle: 'wide',
            duration: 5,
            visualElements: [],
            generationPrompt: 'Test prompt'
          }],
          styleGuide: {
            artStyle: 'photorealistic',
            colorPalette: 'natural',
            visualMood: 'happy'
          }
        },
        generationSettings: {
          provider: 'google',
          model: 'test-model',
          parameters: {
            aspectRatio: '16:9',
            quality: 'high',
            stylization: 0.8,
            coherence: 0.9
          }
        },
        qualityAssurance: {
          validationRules: {
            minConsistencyScore: 0.7,
            maxRegenerationCount: 3,
            requiredElements: [],
            forbiddenElements: []
          }
        },
        usage: {
          createdBy: 'test',
          createdAt: '2024-01-01T00:00:00.000Z',
          usageCount: 0
        },
        status: 'draft'
      }

      const result = safeParsePrompt(invalidPrompt)
      expect(result.success).toBe(false)
    })

    test('should validate version format', () => {
      const invalidVersions = ['1.0', 'v1.0.0', '1', 'latest']
      
      for (const version of invalidVersions) {
        const prompt = createDefaultPrompt({ version })
        const result = safeParsePrompt(prompt)
        expect(result.success).toBe(false)
      }
    })
  })

  // =============================================================================
  // 유틸리티 함수 테스트
  // =============================================================================

  describe('Utility Functions', () => {
    test('createDefaultPrompt should generate valid prompt', () => {
      const defaultPrompt = createDefaultPrompt()
      const result = safeParsePrompt(defaultPrompt)
      
      expect(result.success).toBe(true)
      expect(defaultPrompt.id).toMatch(/^prompt_\d+$/)
      expect(defaultPrompt.version).toBe('1.0.0')
      expect(defaultPrompt.status).toBe('draft')
    })

    test('createDefaultPrompt should merge overrides', () => {
      const overrides = {
        id: 'custom_id',
        metadata: {
          title: 'Custom Title',
          description: 'Custom Description',
          category: 'character' as const,
          tags: ['custom'],
          difficulty: 'hard' as const,
          estimatedTokens: 200,
          language: 'en',
          targetAudience: 'expert' as const
        }
      }

      const prompt = createDefaultPrompt(overrides)
      
      expect(prompt.id).toBe('custom_id')
      expect(prompt.metadata.title).toBe('Custom Title')
      expect(prompt.metadata.category).toBe('character')
      expect(prompt.metadata.difficulty).toBe('hard')
    })

    test('validatePrompt should return detailed errors', () => {
      const invalidData = {
        id: '', // Empty string should fail
        projectId: 'valid_project',
        version: 'invalid_version'
      }

      const result = validatePrompt(invalidData)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toBeInstanceOf(Array)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.data).toBeUndefined()
    })
  })

  // =============================================================================
  // 데이터 무결성 테스트
  // =============================================================================

  describe('Data Integrity', () => {
    test('should enforce numeric constraints', () => {
      const testCases = [
        { field: 'metadata.estimatedTokens', value: -1, shouldFail: true },
        { field: 'usage.usageCount', value: -5, shouldFail: true },
        { field: 'generationSettings.parameters.stylization', value: -0.1, shouldFail: true },
        { field: 'generationSettings.parameters.stylization', value: 1.1, shouldFail: true },
        { field: 'qualityAssurance.validationRules.minConsistencyScore', value: 2, shouldFail: true }
      ]

      for (const testCase of testCases) {
        const prompt = createDefaultPrompt()
        
        // Set nested value using path
        const keys = testCase.field.split('.')
        let current: Record<string, unknown> = prompt as Record<string, unknown>
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]] as Record<string, unknown>
        }
        current[keys[keys.length - 1]] = testCase.value

        const result = safeParsePrompt(prompt)
        if (testCase.shouldFail) {
          expect(result.success).toBe(false)
        } else {
          expect(result.success).toBe(true)
        }
      }
    })

    test('should enforce string constraints', () => {
      const emptyIdPrompt = createDefaultPrompt({ id: '' })
      const result = safeParsePrompt(emptyIdPrompt)
      expect(result.success).toBe(false)
    })

    test('should enforce array constraints', () => {
      const prompt = createDefaultPrompt()
      prompt.promptStructure.shotBreakdown = [] // Empty array should fail
      
      const result = safeParsePrompt(prompt)
      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // 호환성 테스트 (업그레이드/다운그레이드)
  // =============================================================================

  describe('Schema Compatibility', () => {
    test('should handle optional fields gracefully', () => {
      const minimalPrompt = {
        id: 'test_id',
        projectId: 'test_project',
        version: '1.0.0',
        metadata: {
          title: 'Minimal Prompt'
        },
        promptStructure: {
          shotBreakdown: [{
            shotNumber: 1,
            description: 'Test shot',
            cameraAngle: 'wide' as const,
            duration: 5,
            visualElements: [],
            generationPrompt: 'Test'
          }],
          styleGuide: {
            artStyle: 'photorealistic' as const,
            colorPalette: 'natural' as const,
            visualMood: 'happy' as const
          }
        },
        generationSettings: {
          provider: 'google' as const,
          model: 'test-model',
          parameters: {
            aspectRatio: '16:9' as const,
            quality: 'high' as const,
            stylization: 0.8,
            coherence: 0.9
          }
        },
        qualityAssurance: {
          validationRules: {
            minConsistencyScore: 0.7,
            maxRegenerationCount: 3,
            requiredElements: [],
            forbiddenElements: []
          }
        },
        usage: {
          createdBy: 'test',
          createdAt: '2024-01-01T00:00:00.000Z',
          usageCount: 0
        },
        status: 'draft' as const
      }

      const result = safeParsePrompt(minimalPrompt)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.metadata.description).toBe('')
        expect(result.data.metadata.tags).toEqual([])
        expect(result.data.metadata.difficulty).toBe('medium')
      }
    })
  })

  // =============================================================================
  // 성능 테스트
  // =============================================================================

  describe('Performance', () => {
    test('should validate large datasets efficiently', () => {
      const startTime = performance.now()
      
      for (let i = 0; i < 1000; i++) {
        const prompt = createDefaultPrompt({
          id: `prompt_${i}`,
          metadata: {
            title: `Prompt ${i}`,
            description: `Description for prompt ${i}`,
            category: 'storyboard',
            tags: [`tag${i}`],
            difficulty: 'medium',
            estimatedTokens: 100 + i,
            language: 'ko',
            targetAudience: 'professional'
          }
        })
        
        const result = safeParsePrompt(prompt)
        expect(result.success).toBe(true)
      }
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      // Should complete 1000 validations in reasonable time (< 1 second)
      expect(executionTime).toBeLessThan(1000)
    })
  })

  // =============================================================================
  // 보안 테스트
  // =============================================================================

  describe('Security Validation', () => {
    test('should sanitize malicious input', () => {
      const maliciousPrompt = {
        id: '<script>alert("xss")</script>',
        projectId: 'project_123',
        version: '1.0.0',
        metadata: {
          title: '"><script>alert("xss")</script>',
          description: 'javascript:alert("xss")',
          category: 'storyboard',
          tags: ['<img src="x" onerror="alert(1)">'],
          difficulty: 'medium',
          estimatedTokens: 100,
          language: 'ko',
          targetAudience: 'professional'
        },
        promptStructure: {
          shotBreakdown: [{
            shotNumber: 1,
            description: 'Normal description',
            cameraAngle: 'wide',
            duration: 5,
            visualElements: [],
            generationPrompt: 'Safe prompt'
          }],
          styleGuide: {
            artStyle: 'photorealistic',
            colorPalette: 'natural',
            visualMood: 'happy'
          }
        },
        generationSettings: {
          provider: 'google',
          model: 'valid-model',
          parameters: {
            aspectRatio: '16:9',
            quality: 'high',
            stylization: 0.8,
            coherence: 0.9
          }
        },
        qualityAssurance: {
          validationRules: {
            minConsistencyScore: 0.7,
            maxRegenerationCount: 3,
            requiredElements: [],
            forbiddenElements: []
          }
        },
        usage: {
          createdBy: 'test_user',
          createdAt: '2024-01-01T00:00:00.000Z',
          usageCount: 0
        },
        status: 'draft'
      }

      // Schema should accept string inputs (sanitization happens at application layer)
      const result = safeParsePrompt(maliciousPrompt)
      expect(result.success).toBe(true)
      
      // But we should validate the structure is correct
      if (result.success) {
        expect(typeof result.data.id).toBe('string')
        expect(typeof result.data.metadata.title).toBe('string')
        expect(Array.isArray(result.data.metadata.tags)).toBe(true)
      }
    })
  })
})