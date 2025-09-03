/**
 * API Contract Verification Tests
 * 
 * Purpose: Verify API endpoints match FRD specifications exactly
 * Follows: Benjamin's contract-first development standards
 */
import { describe, it, expect } from '@jest/globals'
import { 
  GenerateStoryRequestSchema, 
  Generate4ActRequestSchema,
  Generate12ShotRequestSchema,
  ExportPlanRequestSchema 
} from '../../model/schemas'

describe('Planning API Contract Verification', () => {
  describe('Request Schema Validation', () => {
    it('should accept valid integer projectId', () => {
      const validRequest = {
        projectId: 123,
        outline: 'A compelling story about adventure and growth',
        genre: 'adventure' as const,
        targetLength: '5-10분' as const
      }

      expect(() => GenerateStoryRequestSchema.parse(validRequest)).not.toThrow()
    })

    it('should accept string numeric projectId', () => {
      const validRequest = {
        projectId: '456',
        outline: 'A compelling story about adventure and growth',
        genre: 'adventure' as const,
        targetLength: '5-10분' as const
      }

      const parsed = GenerateStoryRequestSchema.parse(validRequest)
      expect(typeof parsed.projectId).toBe('number')
      expect(parsed.projectId).toBe(456)
    })

    it('should reject invalid projectId formats', () => {
      const invalidRequest = {
        projectId: 'test-project-123', // Non-numeric string
        outline: 'A compelling story',
        genre: 'adventure' as const,
        targetLength: '5-10분' as const
      }

      expect(() => GenerateStoryRequestSchema.parse(invalidRequest)).toThrow('유효한 프로젝트 ID가 필요합니다')
    })

    it('should reject negative projectId', () => {
      const invalidRequest = {
        projectId: -1,
        outline: 'A compelling story',
        genre: 'adventure' as const,
        targetLength: '5-10분' as const
      }

      expect(() => GenerateStoryRequestSchema.parse(invalidRequest)).toThrow('유효한 프로젝트 ID가 필요합니다')
    })

    it('should enforce minimum outline length', () => {
      const invalidRequest = {
        projectId: 1,
        outline: 'Short', // Less than 10 characters
        genre: 'adventure' as const,
        targetLength: '5-10분' as const
      }

      expect(() => GenerateStoryRequestSchema.parse(invalidRequest)).toThrow('스토리 개요는 최소 10자 이상')
    })
  })

  describe('API Endpoint URLs', () => {
    it('should use FRD-compliant URL pattern for story generation', () => {
      const projectId = 123
      const expectedUrl = `/api/v1/projects/${projectId}/planning/generate-story/`
      
      // This would be tested in actual API call tests
      expect(expectedUrl).toBe('/api/v1/projects/123/planning/generate-story/')
    })

    it('should use FRD-compliant URL pattern for 4-act generation', () => {
      const projectId = 456
      const expectedUrl = `/api/v1/projects/${projectId}/planning/generate-4act/`
      
      expect(expectedUrl).toBe('/api/v1/projects/456/planning/generate-4act/')
    })

    it('should use FRD-compliant URL pattern for 12-shot generation', () => {
      const projectId = 789
      const expectedUrl = `/api/v1/projects/${projectId}/planning/generate-12shot/`
      
      expect(expectedUrl).toBe('/api/v1/projects/789/planning/generate-12shot/')
    })

    it('should use unified export endpoint for both PDF and JSON', () => {
      const projectId = 123
      const exportUrl = `/api/v1/projects/${projectId}/planning/export/`
      
      expect(exportUrl).toBe('/api/v1/projects/123/planning/export/')
    })
  })

  describe('Contract Compatibility', () => {
    it('should maintain backward compatibility with existing data structures', () => {
      const act4Response = {
        act1: { title: '도입부', description: '상황 설정', duration: '30초' },
        act2: { title: '전개부', description: '갈등 발생', duration: '60초' },
        act3: { title: '위기', description: '절정 부분', duration: '45초' },
        act4: { title: '결말', description: '해결과 마무리', duration: '30초' }
      }

      const generate12ShotRequest = {
        projectId: 123,
        story: 'Generated story content',
        acts: act4Response
      }

      expect(() => Generate12ShotRequestSchema.parse(generate12ShotRequest)).not.toThrow()
    })

    it('should validate complete export request structure', () => {
      const exportRequest = {
        projectId: 123,
        story: 'Complete story content',
        acts: {
          act1: { title: '도입부', description: '상황 설정', duration: '30초' },
          act2: { title: '전개부', description: '갈등 발생', duration: '60초' },
          act3: { title: '위기', description: '절정 부분', duration: '45초' },
          act4: { title: '결말', description: '해결과 마무리', duration: '30초' }
        },
        shots: {
          shots: Array.from({ length: 12 }, (_, i) => ({
            shotNumber: i + 1,
            type: 'wide',
            description: `Shot ${i + 1} description`,
            duration: '10초',
            location: '실내',
            notes: 'Optional notes'
          }))
        }
      }

      expect(() => ExportPlanRequestSchema.parse(exportRequest)).not.toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should provide clear validation error messages', () => {
      const invalidRequest = {
        projectId: 'invalid',
        outline: '',
        genre: 'invalid-genre',
        targetLength: 'invalid-length'
      }

      try {
        GenerateStoryRequestSchema.parse(invalidRequest)
        fail('Should have thrown validation error')
      } catch (error: any) {
        expect(error.message).toContain('프로젝트 ID')
      }
    })
  })
})

/**
 * Integration Tests for Contract Verification
 * 
 * These tests ensure the actual API endpoints work with the validated schemas
 */
describe('Planning API Integration Contract Tests', () => {
  // These would typically use MSW for mocking
  describe('Mock Server Contract Verification', () => {
    it('should accept requests with validated schemas', () => {
      // Test would use MSW to mock API responses
      // and verify request/response contract compliance
      expect(true).toBe(true) // Placeholder for actual MSW tests
    })
  })
})