/**
 * 데이터 무결성 검증 및 충돌 해결 테스트
 * TDD 원칙에 따른 데이터 품질 보장 테스트
 */

import { describe, test, expect, beforeEach } from '@jest/globals'
import {
  DataIntegrityValidator,
  ConflictResolver,
  type IntegrityCheckResult,
  type ConflictResolutionResult,
  type DataConflict,
  type IntegrityRule,
  type ValidationContext
} from './data-integrity'
import { VideoPlanetPrompt } from './prompt-contracts'

describe('DataIntegrityValidator 테스트', () => {
  let validator: DataIntegrityValidator
  let mockPrompts: VideoPlanetPrompt[]

  beforeEach(() => {
    validator = new DataIntegrityValidator()
    mockPrompts = [
      {
        id: 'prompt_integrity_001',
        projectId: 'project_test_001',
        version: '1.0.0',
        metadata: {
          title: '무결성 테스트 프롬프트 1',
          description: '데이터 무결성 검증을 위한 테스트 프롬프트',
          category: 'storyboard',
          tags: ['test', 'integrity'],
          difficulty: 'medium',
          estimatedTokens: 200
        },
        promptStructure: {
          shotBreakdown: [
            {
              shotNumber: 1,
              description: '첫 번째 샷 설명',
              cameraAngle: 'wide',
              duration: 5,
              visualElements: ['element1', 'element2'],
              generationPrompt: 'test prompt for shot 1'
            }
          ],
          styleGuide: {
            artStyle: 'cinematic',
            colorPalette: 'warm_tones',
            visualMood: 'romantic'
          }
        },
        usage: {
          createdBy: 'user_test',
          createdAt: '2025-01-15T10:30:00.000Z',
          usageCount: 3
        },
        status: 'active'
      },
      {
        id: 'prompt_integrity_002',
        projectId: 'project_test_001',
        version: '1.0.0',
        metadata: {
          title: '무결성 테스트 프롬프트 2',
          category: 'storyboard',
          tags: ['test'],
          difficulty: 'easy',
          estimatedTokens: 150
        },
        status: 'active'
      }
    ]
  })

  describe('기본 무결성 검증 테스트', () => {
    test('유효한 데이터 검증 통과', async () => {
      const result = await validator.validateDataIntegrity(mockPrompts[0])

      expect(result.isValid).toBe(true)
      expect(result.score).toBeGreaterThan(0.8)
      expect(result.violations).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    test('필수 필드 누락 검증 실패', async () => {
      const invalidPrompt = {
        ...mockPrompts[0],
        metadata: {
          ...mockPrompts[0].metadata,
          title: '', // 필수 필드 비어있음
          estimatedTokens: -100 // 잘못된 값
        }
      }

      const result = await validator.validateDataIntegrity(invalidPrompt)

      expect(result.isValid).toBe(false)
      expect(result.violations.length).toBeGreaterThan(0)
      expect(result.violations.some(v => v.rule === 'REQUIRED_FIELD_MISSING')).toBe(true)
      expect(result.violations.some(v => v.rule === 'INVALID_VALUE_RANGE')).toBe(true)
    })

    test('데이터 타입 불일치 검증', async () => {
      const invalidPrompt = {
        ...mockPrompts[0],
        metadata: {
          ...mockPrompts[0].metadata,
          estimatedTokens: 'invalid_number' as any, // 문자열이지만 숫자여야 함
          difficulty: 'invalid_difficulty' as any // 잘못된 enum 값
        }
      }

      const result = await validator.validateDataIntegrity(invalidPrompt)

      expect(result.isValid).toBe(false)
      expect(result.violations.some(v => v.rule === 'INVALID_DATA_TYPE')).toBe(true)
      expect(result.violations.some(v => v.rule === 'INVALID_ENUM_VALUE')).toBe(true)
    })

    test('참조 무결성 검증', async () => {
      const promptWithInvalidRef = {
        ...mockPrompts[0],
        projectId: '', // 빈 프로젝트 ID
        parentPromptId: 'non_existent_prompt' // 존재하지 않는 부모 프롬프트
      }

      const result = await validator.validateDataIntegrity(promptWithInvalidRef, {
        checkReferences: true,
        existingPrompts: mockPrompts
      })

      expect(result.isValid).toBe(false)
      expect(result.violations.some(v => v.rule === 'INVALID_REFERENCE')).toBe(true)
    })

    test('비즈니스 로직 검증', async () => {
      const invalidBusinessLogic = {
        ...mockPrompts[0],
        promptStructure: {
          ...mockPrompts[0].promptStructure!,
          shotBreakdown: [
            {
              shotNumber: 5, // 샷 번호가 1부터 시작하지 않음
              description: 'Invalid shot',
              cameraAngle: 'wide' as const,
              duration: -5, // 음수 지속시간
              visualElements: [],
              generationPrompt: 'test'
            }
          ]
        }
      }

      const result = await validator.validateDataIntegrity(invalidBusinessLogic)

      expect(result.isValid).toBe(false)
      expect(result.violations.some(v => v.rule === 'INVALID_SHOT_SEQUENCE')).toBe(true)
      expect(result.violations.some(v => v.rule === 'INVALID_DURATION')).toBe(true)
    })

    test('중복 데이터 검증', async () => {
      const duplicatePrompts = [
        mockPrompts[0],
        { ...mockPrompts[0] } // 같은 ID의 중복 프롬프트
      ]

      const result = await validator.validateDataIntegrityBatch(duplicatePrompts)

      expect(result.globalViolations.some(v => v.rule === 'DUPLICATE_IDS')).toBe(true)
      expect(result.duplicates.length).toBe(1)
      expect(result.duplicates[0].ids).toContain(mockPrompts[0].id)
    })
  })

  describe('커스텀 무결성 규칙 테스트', () => {
    test('사용자 정의 규칙 추가 및 검증', async () => {
      const customRule: IntegrityRule = {
        id: 'CUSTOM_TOKEN_LIMIT',
        name: 'Token Limit Check',
        description: 'Prompts should not exceed 1000 tokens',
        severity: 'warning',
        validator: (data: any) => {
          const tokens = data.metadata?.estimatedTokens || 0
          return {
            valid: tokens <= 1000,
            message: tokens > 1000 ? `Token count ${tokens} exceeds limit of 1000` : undefined
          }
        }
      }

      validator.addCustomRule(customRule)

      const highTokenPrompt = {
        ...mockPrompts[0],
        metadata: {
          ...mockPrompts[0].metadata,
          estimatedTokens: 1500 // 제한 초과
        }
      }

      const result = await validator.validateDataIntegrity(highTokenPrompt)

      expect(result.warnings.some(w => w.rule === 'CUSTOM_TOKEN_LIMIT')).toBe(true)
    })

    test('동적 규칙 조건부 적용', async () => {
      const conditionalRule: IntegrityRule = {
        id: 'CONDITIONAL_DIFFICULTY_CHECK',
        name: 'Conditional Difficulty Check',
        description: 'Hard prompts must have detailed descriptions',
        severity: 'error',
        condition: (data: any) => data.metadata?.difficulty === 'hard',
        validator: (data: any) => {
          const description = data.metadata?.description || ''
          return {
            valid: description.length >= 50,
            message: description.length < 50 ? 'Hard prompts require detailed descriptions (50+ chars)' : undefined
          }
        }
      }

      validator.addCustomRule(conditionalRule)

      const hardPromptWithShortDesc = {
        ...mockPrompts[0],
        metadata: {
          ...mockPrompts[0].metadata,
          difficulty: 'hard' as const,
          description: 'Short desc' // 50자 미만
        }
      }

      const result = await validator.validateDataIntegrity(hardPromptWithShortDesc)

      expect(result.violations.some(v => v.rule === 'CONDITIONAL_DIFFICULTY_CHECK')).toBe(true)
    })
  })

  describe('배치 무결성 검증 테스트', () => {
    test('대용량 배치 검증 성능', async () => {
      const largePromptSet = Array(1000).fill(null).map((_, index) => ({
        ...mockPrompts[0],
        id: `prompt_batch_${index.toString().padStart(4, '0')}`,
        metadata: {
          ...mockPrompts[0].metadata,
          title: `Batch Prompt ${index + 1}`
        }
      }))

      const startTime = performance.now()
      const result = await validator.validateDataIntegrityBatch(largePromptSet, {
        parallelProcessing: true,
        batchSize: 50
      })
      const endTime = performance.now()

      expect(result.summary.totalItems).toBe(1000)
      expect(result.summary.validItems).toBe(1000)
      expect(endTime - startTime).toBeLessThan(5000) // 5초 이내
    })

    test('부분 실패 허용 배치 검증', async () => {
      const mixedQualityPrompts = [
        mockPrompts[0], // 유효
        { ...mockPrompts[1], id: 'invalid-id-format' }, // 무효 (ID 형식)
        mockPrompts[1], // 유효
        { ...mockPrompts[0], metadata: { ...mockPrompts[0].metadata, estimatedTokens: -50 } } // 무효 (토큰)
      ]

      const result = await validator.validateDataIntegrityBatch(mixedQualityPrompts, {
        allowPartialSuccess: true,
        stopOnFirstError: false
      })

      expect(result.summary.totalItems).toBe(4)
      expect(result.summary.validItems).toBe(2)
      expect(result.summary.invalidItems).toBe(2)
      expect(result.itemResults).toHaveLength(4)
    })
  })

  describe('데이터 복구 테스트', () => {
    test('자동 데이터 복구', async () => {
      const corruptedPrompt = {
        ...mockPrompts[0],
        metadata: {
          ...mockPrompts[0].metadata,
          estimatedTokens: -100, // 잘못된 값
          difficulty: 'invalid' as any // 잘못된 enum
        }
      }

      const result = await validator.validateDataIntegrity(corruptedPrompt, {
        autoRepair: true
      })

      expect(result.repairAttempted).toBe(true)
      expect(result.repairedData).toBeDefined()
      expect(result.repairedData.metadata.estimatedTokens).toBeGreaterThan(0)
      expect(['easy', 'medium', 'hard', 'expert']).toContain(result.repairedData.metadata.difficulty)
    })

    test('복구 불가능한 데이터 처리', async () => {
      const irreparablePrompt = {
        id: '', // 필수 ID 없음
        projectId: '',
        version: '',
        metadata: {
          title: '',
          category: 'invalid_category' as any,
          tags: [],
          difficulty: 'easy' as const,
          estimatedTokens: 0
        }
      }

      const result = await validator.validateDataIntegrity(irreparablePrompt, {
        autoRepair: true
      })

      expect(result.repairAttempted).toBe(true)
      expect(result.isValid).toBe(false) // 여전히 복구 불가
      expect(result.repairLog).toBeDefined()
      expect(result.repairLog!.failedRepairs.length).toBeGreaterThan(0)
    })
  })
})

describe('ConflictResolver 테스트', () => {
  let resolver: ConflictResolver
  let existingPrompt: VideoPlanetPrompt
  let incomingPrompt: VideoPlanetPrompt

  beforeEach(() => {
    resolver = new ConflictResolver()
    existingPrompt = {
      id: 'prompt_conflict_test',
      projectId: 'project_test',
      version: '1.0.0',
      metadata: {
        title: '기존 프롬프트',
        description: '이미 존재하는 프롬프트입니다.',
        category: 'storyboard',
        tags: ['existing', 'test'],
        difficulty: 'medium',
        estimatedTokens: 200
      },
      usage: {
        createdBy: 'user_existing',
        createdAt: '2025-01-10T10:00:00.000Z',
        lastUsedAt: '2025-01-14T15:30:00.000Z',
        usageCount: 10
      },
      status: 'active'
    }

    incomingPrompt = {
      id: 'prompt_conflict_test', // 같은 ID
      projectId: 'project_test',
      version: '1.1.0', // 다른 버전
      metadata: {
        title: '수정된 프롬프트',
        description: '업데이트된 프롬프트입니다.',
        category: 'storyboard',
        tags: ['updated', 'test'],
        difficulty: 'hard',
        estimatedTokens: 300
      },
      usage: {
        createdBy: 'user_updater',
        createdAt: '2025-01-15T12:00:00.000Z',
        usageCount: 1
      },
      status: 'active'
    }
  })

  describe('충돌 감지 테스트', () => {
    test('ID 충돌 감지', async () => {
      const conflicts = await resolver.detectConflicts([incomingPrompt], [existingPrompt])

      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].type).toBe('ID_CONFLICT')
      expect(conflicts[0].conflictingField).toBe('id')
      expect(conflicts[0].existingValue).toBe(existingPrompt.id)
      expect(conflicts[0].incomingValue).toBe(incomingPrompt.id)
    })

    test('버전 충돌 감지', async () => {
      const conflicts = await resolver.detectConflicts([incomingPrompt], [existingPrompt])
      const versionConflict = conflicts.find(c => c.type === 'VERSION_CONFLICT')

      expect(versionConflict).toBeDefined()
      expect(versionConflict!.conflictingField).toBe('version')
      expect(versionConflict!.existingValue).toBe('1.0.0')
      expect(versionConflict!.incomingValue).toBe('1.1.0')
    })

    test('데이터 불일치 감지', async () => {
      const conflicts = await resolver.detectConflicts([incomingPrompt], [existingPrompt])
      const dataConflicts = conflicts.filter(c => c.type === 'DATA_CONFLICT')

      expect(dataConflicts.length).toBeGreaterThan(0)
      expect(dataConflicts.some(c => c.conflictingField === 'metadata.title')).toBe(true)
      expect(dataConflicts.some(c => c.conflictingField === 'metadata.difficulty')).toBe(true)
    })

    test('심각도 기반 충돌 분류', async () => {
      const conflicts = await resolver.detectConflicts([incomingPrompt], [existingPrompt])

      const criticalConflicts = conflicts.filter(c => c.severity === 'critical')
      const majorConflicts = conflicts.filter(c => c.severity === 'major')
      const minorConflicts = conflicts.filter(c => c.severity === 'minor')

      // ID 충돌은 critical
      expect(criticalConflicts.some(c => c.type === 'ID_CONFLICT')).toBe(true)
      // 메타데이터 변경은 minor
      expect(minorConflicts.some(c => c.conflictingField?.startsWith('metadata'))).toBe(true)
    })
  })

  describe('충돌 해결 전략 테스트', () => {
    test('Skip 전략 - 기존 데이터 보존', async () => {
      const conflict: DataConflict = {
        id: 'conflict_skip_test',
        type: 'ID_CONFLICT',
        conflictingField: 'id',
        existingItem: existingPrompt,
        incomingItem: incomingPrompt,
        existingValue: existingPrompt.id,
        incomingValue: incomingPrompt.id,
        severity: 'critical'
      }

      const result = await resolver.resolveConflict(conflict, 'skip')

      expect(result.strategy).toBe('skip')
      expect(result.success).toBe(true)
      expect(result.resolvedItem).toEqual(existingPrompt)
      expect(result.action).toBe('kept_existing')
    })

    test('Overwrite 전략 - 새 데이터로 덮어쓰기', async () => {
      const conflict: DataConflict = {
        id: 'conflict_overwrite_test',
        type: 'DATA_CONFLICT',
        conflictingField: 'metadata.title',
        existingItem: existingPrompt,
        incomingItem: incomingPrompt,
        existingValue: existingPrompt.metadata.title,
        incomingValue: incomingPrompt.metadata.title,
        severity: 'minor'
      }

      const result = await resolver.resolveConflict(conflict, 'overwrite')

      expect(result.strategy).toBe('overwrite')
      expect(result.success).toBe(true)
      expect(result.resolvedItem).toEqual(incomingPrompt)
      expect(result.action).toBe('used_incoming')
    })

    test('Merge 전략 - 데이터 병합', async () => {
      const conflict: DataConflict = {
        id: 'conflict_merge_test',
        type: 'DATA_CONFLICT',
        conflictingField: 'metadata',
        existingItem: existingPrompt,
        incomingItem: incomingPrompt,
        existingValue: existingPrompt.metadata,
        incomingValue: incomingPrompt.metadata,
        severity: 'major'
      }

      const result = await resolver.resolveConflict(conflict, 'merge')

      expect(result.strategy).toBe('merge')
      expect(result.success).toBe(true)
      expect(result.resolvedItem).toBeDefined()
      
      // 병합된 데이터 검증
      const merged = result.resolvedItem
      expect(merged.metadata.title).toBe(incomingPrompt.metadata.title) // 새 데이터 우선
      expect(merged.usage?.usageCount).toBe(existingPrompt.usage?.usageCount) // 사용 통계는 기존 데이터 유지
    })

    test('Rename 전략 - 새 항목 이름 변경', async () => {
      const conflict: DataConflict = {
        id: 'conflict_rename_test',
        type: 'ID_CONFLICT',
        conflictingField: 'id',
        existingItem: existingPrompt,
        incomingItem: incomingPrompt,
        existingValue: existingPrompt.id,
        incomingValue: incomingPrompt.id,
        severity: 'critical'
      }

      const result = await resolver.resolveConflict(conflict, 'rename')

      expect(result.strategy).toBe('rename')
      expect(result.success).toBe(true)
      expect(result.resolvedItem.id).not.toBe(incomingPrompt.id)
      expect(result.resolvedItem.id).toContain('_conflict_resolved_')
      expect(result.action).toBe('renamed_incoming')
    })

    test('Version 전략 - 버전 기반 해결', async () => {
      const conflict: DataConflict = {
        id: 'conflict_version_test',
        type: 'VERSION_CONFLICT',
        conflictingField: 'version',
        existingItem: existingPrompt,
        incomingItem: incomingPrompt,
        existingValue: existingPrompt.version,
        incomingValue: incomingPrompt.version,
        severity: 'major'
      }

      const result = await resolver.resolveConflict(conflict, 'use_latest_version')

      expect(result.strategy).toBe('use_latest_version')
      expect(result.success).toBe(true)
      // 버전이 더 높은 것(1.1.0)을 선택해야 함
      expect(result.resolvedItem.version).toBe(incomingPrompt.version)
    })
  })

  describe('배치 충돌 해결 테스트', () => {
    test('다중 충돌 일괄 해결', async () => {
      const incomingPrompts = [
        incomingPrompt,
        {
          ...incomingPrompt,
          id: 'prompt_batch_conflict_1',
          metadata: { ...incomingPrompt.metadata, title: 'Batch Conflict 1' }
        },
        {
          ...incomingPrompt,
          id: 'prompt_batch_conflict_2',
          metadata: { ...incomingPrompt.metadata, title: 'Batch Conflict 2' }
        }
      ]

      const existingPrompts = [
        existingPrompt,
        {
          ...existingPrompt,
          id: 'prompt_batch_conflict_1',
          metadata: { ...existingPrompt.metadata, title: 'Existing Batch 1' }
        }
      ]

      const result = await resolver.resolveBatchConflicts(incomingPrompts, existingPrompts, {
        defaultStrategy: 'merge',
        strategyByType: {
          'ID_CONFLICT': 'rename',
          'DATA_CONFLICT': 'merge'
        }
      })

      expect(result.totalProcessed).toBe(3)
      expect(result.conflictsDetected).toBe(2) // 2개의 ID 충돌
      expect(result.resolutionsApplied).toBe(2)
      expect(result.resolved).toHaveLength(3)
    })

    test('우선순위 기반 충돌 해결', async () => {
      const priorityRules = [
        {
          condition: (conflict: DataConflict) => conflict.severity === 'critical',
          strategy: 'rename' as const
        },
        {
          condition: (conflict: DataConflict) => conflict.type === 'VERSION_CONFLICT',
          strategy: 'use_latest_version' as const
        },
        {
          condition: () => true, // 기본값
          strategy: 'merge' as const
        }
      ]

      const result = await resolver.resolveBatchConflicts([incomingPrompt], [existingPrompt], {
        priorityRules
      })

      expect(result.resolutionsApplied).toBeGreaterThan(0)
      
      // Critical ID 충돌은 rename으로 해결되어야 함
      const idConflictResolution = result.resolutionLog.find(r => r.conflictType === 'ID_CONFLICT')
      expect(idConflictResolution?.strategyUsed).toBe('rename')
    })
  })

  describe('고급 충돌 해결 테스트', () => {
    test('사용자 정의 해결 로직', async () => {
      const customResolver = async (conflict: DataConflict) => {
        // 사용자 활동이 많은 프롬프트를 우선
        const existingUsage = conflict.existingItem.usage?.usageCount || 0
        const incomingUsage = conflict.incomingItem.usage?.usageCount || 0
        
        return {
          strategy: 'custom_usage_priority' as const,
          success: true,
          resolvedItem: existingUsage > incomingUsage ? conflict.existingItem : conflict.incomingItem,
          action: existingUsage > incomingUsage ? 'kept_existing_high_usage' : 'used_incoming_high_usage',
          metadata: {
            existingUsage,
            incomingUsage
          }
        }
      }

      resolver.addCustomResolver('usage_priority', customResolver)

      const conflict: DataConflict = {
        id: 'conflict_custom_test',
        type: 'DATA_CONFLICT',
        conflictingField: 'metadata',
        existingItem: existingPrompt, // usageCount: 10
        incomingItem: incomingPrompt, // usageCount: 1
        existingValue: existingPrompt.metadata,
        incomingValue: incomingPrompt.metadata,
        severity: 'major'
      }

      const result = await resolver.resolveConflict(conflict, 'usage_priority')

      expect(result.success).toBe(true)
      expect(result.action).toBe('kept_existing_high_usage')
      expect(result.resolvedItem).toEqual(existingPrompt)
    })

    test('조건부 해결 전략', async () => {
      const conditionalStrategy = {
        name: 'time_based',
        condition: (conflict: DataConflict) => {
          const existingTime = new Date(conflict.existingItem.usage?.createdAt || 0).getTime()
          const incomingTime = new Date(conflict.incomingItem.usage?.createdAt || 0).getTime()
          return Math.abs(incomingTime - existingTime) < 24 * 60 * 60 * 1000 // 24시간 이내
        },
        resolver: async (conflict: DataConflict) => {
          const existingTime = new Date(conflict.existingItem.usage?.createdAt || 0).getTime()
          const incomingTime = new Date(conflict.incomingItem.usage?.createdAt || 0).getTime()
          
          return {
            strategy: 'use_latest_timestamp' as const,
            success: true,
            resolvedItem: incomingTime > existingTime ? conflict.incomingItem : conflict.existingItem,
            action: incomingTime > existingTime ? 'used_newer_item' : 'kept_older_item'
          }
        }
      }

      resolver.addConditionalStrategy(conditionalStrategy)

      const recentConflict: DataConflict = {
        id: 'conflict_time_test',
        type: 'DATA_CONFLICT',
        conflictingField: 'metadata.title',
        existingItem: existingPrompt,
        incomingItem: incomingPrompt,
        existingValue: existingPrompt.metadata.title,
        incomingValue: incomingPrompt.metadata.title,
        severity: 'minor'
      }

      const result = await resolver.resolveConflict(recentConflict, 'time_based')

      expect(result.success).toBe(true)
      expect(result.action).toBe('used_newer_item') // incomingPrompt가 더 최근
    })
  })

  describe('충돌 해결 성능 테스트', () => {
    test('대용량 충돌 해결 성능', async () => {
      const largeIncomingSet = Array(500).fill(null).map((_, index) => ({
        ...incomingPrompt,
        id: `prompt_large_conflict_${index}`,
        metadata: {
          ...incomingPrompt.metadata,
          title: `Large Conflict Prompt ${index}`
        }
      }))

      const largeExistingSet = Array(500).fill(null).map((_, index) => ({
        ...existingPrompt,
        id: `prompt_large_conflict_${index}`,
        metadata: {
          ...existingPrompt.metadata,
          title: `Large Existing Prompt ${index}`
        }
      }))

      const startTime = performance.now()
      const result = await resolver.resolveBatchConflicts(largeIncomingSet, largeExistingSet, {
        defaultStrategy: 'merge',
        parallelProcessing: true,
        batchSize: 50
      })
      const endTime = performance.now()

      expect(result.totalProcessed).toBe(500)
      expect(result.conflictsDetected).toBe(500)
      expect(endTime - startTime).toBeLessThan(3000) // 3초 이내
    })

    test('메모리 효율성 테스트', async () => {
      const memoryIntensivePrompts = Array(1000).fill(null).map((_, index) => ({
        ...incomingPrompt,
        id: `prompt_memory_${index}`,
        promptStructure: {
          shotBreakdown: Array(50).fill(null).map((_, shotIndex) => ({
            shotNumber: shotIndex + 1,
            description: `Shot ${shotIndex + 1} for memory test prompt ${index}`,
            cameraAngle: 'wide' as const,
            duration: 5,
            visualElements: [`element_${shotIndex}_1`, `element_${shotIndex}_2`],
            generationPrompt: `Memory intensive prompt for shot ${shotIndex + 1} in prompt ${index}`
          })),
          styleGuide: {
            artStyle: 'cinematic' as const,
            colorPalette: 'warm_tones' as const,
            visualMood: 'dramatic' as const
          }
        }
      }))

      const initialMemory = process.memoryUsage().heapUsed
      
      const result = await resolver.resolveBatchConflicts(
        memoryIntensivePrompts, 
        memoryIntensivePrompts.slice(0, 500), // 절반만 기존 데이터로
        {
          defaultStrategy: 'merge',
          memoryOptimization: true,
          streamProcessing: true
        }
      )

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      expect(result.totalProcessed).toBe(1000)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024) // 100MB 미만 증가
    })
  })
})