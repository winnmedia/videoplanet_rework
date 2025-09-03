/**
 * 프롬프트 가져오기/내보내기 파이프라인 테스트
 * TDD 원칙에 따른 데이터 무결성 및 성능 테스트
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { z } from 'zod'
import {
  ImportExportPipeline,
  type ImportJob,
  type ExportJob,
  type ImportResult,
  type ExportResult,
  type ConflictResolutionStrategy,
  type DataIntegrityReport
} from './import-export-pipeline'
import {
  VideoPlanetPrompt,
  PromptExportPackage,
  PromptImportPackage
} from '@/shared/lib/prompt-contracts'

describe('ImportExportPipeline 기본 기능 테스트', () => {
  let pipeline: ImportExportPipeline
  let mockPrompts: VideoPlanetPrompt[]

  beforeEach(() => {
    pipeline = new ImportExportPipeline()
    mockPrompts = [
      {
        id: 'prompt_test_001',
        projectId: 'project_test_001',
        version: '1.0.0',
        metadata: {
          title: '카페 로맨스 씬 1',
          description: '따뜻한 카페에서의 첫 만남',
          category: 'storyboard',
          tags: ['romance', 'cafe', 'meeting'],
          difficulty: 'medium',
          estimatedTokens: 250
        },
        promptStructure: {
          shotBreakdown: [
            {
              shotNumber: 1,
              description: '카페 전경을 보여주는 와이드 샷',
              cameraAngle: 'wide',
              duration: 5,
              visualElements: ['cafe_interior', 'warm_lighting'],
              generationPrompt: 'cozy cafe interior, warm lighting, wide shot'
            }
          ],
          styleGuide: {
            artStyle: 'cinematic',
            colorPalette: 'warm_tones',
            visualMood: 'romantic'
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
        usage: {
          createdBy: 'user_test',
          createdAt: '2025-01-15T10:30:00.000Z',
          usageCount: 5
        },
        status: 'active'
      },
      {
        id: 'prompt_test_002',
        projectId: 'project_test_001',
        version: '1.0.0',
        metadata: {
          title: '카페 로맨스 씬 2',
          description: '대화하는 두 주인공',
          category: 'storyboard',
          tags: ['romance', 'conversation', 'characters'],
          difficulty: 'easy',
          estimatedTokens: 180
        },
        promptStructure: {
          shotBreakdown: [
            {
              shotNumber: 1,
              description: '두 주인공이 대화하는 미디움 샷',
              cameraAngle: 'medium',
              duration: 8,
              visualElements: ['characters', 'dialogue_moment'],
              generationPrompt: 'two people talking in cafe, medium shot, natural lighting'
            }
          ],
          styleGuide: {
            artStyle: 'cinematic',
            colorPalette: 'warm_tones',
            visualMood: 'romantic'
          }
        },
        status: 'active'
      }
    ]
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('내보내기 파이프라인 테스트', () => {
    test('기본 JSON 내보내기', async () => {
      const exportJob: ExportJob = {
        id: 'export_json_001',
        title: 'Test Export',
        format: 'json',
        prompts: mockPrompts,
        options: {
          includeMetadata: true,
          includeUsageStats: true,
          compression: 'none',
          encryption: { enabled: false }
        },
        requestedBy: 'user_test',
        requestedAt: new Date().toISOString()
      }

      const result = await pipeline.executeExport(exportJob)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data.exportPackage).toBeDefined()
      expect(result.data.exportPackage.prompts).toHaveLength(2)
      expect(result.data.fileSize).toBeGreaterThan(0)
      expect(result.data.checksum).toBeDefined()
      expect(result.processingTime).toBeLessThan(5000) // 5초 이내
    })

    test('CSV 형식 내보내기', async () => {
      const exportJob: ExportJob = {
        id: 'export_csv_001',
        title: 'CSV Export Test',
        format: 'csv',
        prompts: mockPrompts,
        options: {
          includeMetadata: true,
          flattenStructure: true,
          fieldSelection: ['id', 'title', 'category', 'estimatedTokens']
        },
        requestedBy: 'user_test',
        requestedAt: new Date().toISOString()
      }

      const result = await pipeline.executeExport(exportJob)

      expect(result.success).toBe(true)
      expect(result.data.csvData).toBeDefined()
      expect(result.data.csvData).toContain('id,title,category,estimatedTokens')
      expect(result.data.csvData).toContain('prompt_test_001')
      expect(result.data.csvData).toContain('prompt_test_002')
    })

    test('대용량 내보내기 (1000+ 프롬프트)', async () => {
      const largePromptSet = Array(1200).fill(null).map((_, index) => ({
        ...mockPrompts[0],
        id: `prompt_large_${index.toString().padStart(4, '0')}`,
        metadata: {
          ...mockPrompts[0].metadata,
          title: `Large Export Prompt ${index + 1}`
        }
      }))

      const exportJob: ExportJob = {
        id: 'export_large_001',
        title: 'Large Export Test',
        format: 'json',
        prompts: largePromptSet,
        options: {
          compression: 'gzip',
          streamProcessing: true,
          batchSize: 100
        },
        requestedBy: 'user_test',
        requestedAt: new Date().toISOString()
      }

      const result = await pipeline.executeExport(exportJob)

      expect(result.success).toBe(true)
      expect(result.data.exportPackage.prompts).toHaveLength(1200)
      expect(result.processingTime).toBeLessThan(10000) // 10초 이내
      expect(result.data.compressionRatio).toBeGreaterThan(2) // 최소 2:1 압축
    })

    test('암호화된 내보내기', async () => {
      const exportJob: ExportJob = {
        id: 'export_encrypted_001',
        title: 'Encrypted Export',
        format: 'json',
        prompts: mockPrompts,
        options: {
          encryption: {
            enabled: true,
            algorithm: 'AES-256',
            password: 'test-password-123'
          }
        },
        requestedBy: 'user_test',
        requestedAt: new Date().toISOString()
      }

      const result = await pipeline.executeExport(exportJob)

      expect(result.success).toBe(true)
      expect(result.data.encrypted).toBe(true)
      expect(result.data.encryptionInfo).toBeDefined()
      expect(result.data.encryptionInfo.algorithm).toBe('AES-256')
      expect(result.data.rawData).toBeUndefined() // 암호화로 인해 원본 데이터 숨김
    })

    test('선택적 필드 내보내기', async () => {
      const exportJob: ExportJob = {
        id: 'export_selective_001',
        title: 'Selective Export',
        format: 'json',
        prompts: mockPrompts,
        options: {
          fieldSelection: ['id', 'metadata.title', 'metadata.category'],
          excludeFields: ['usage', 'generationSettings'],
          includeMetadata: false
        },
        requestedBy: 'user_test',
        requestedAt: new Date().toISOString()
      }

      const result = await pipeline.executeExport(exportJob)

      expect(result.success).toBe(true)
      
      // 선택된 필드만 포함되었는지 확인
      result.data.exportPackage.prompts.forEach((prompt: any) => {
        expect(prompt.id).toBeDefined()
        expect(prompt.metadata?.title).toBeDefined()
        expect(prompt.metadata?.category).toBeDefined()
        expect(prompt.usage).toBeUndefined()
        expect(prompt.generationSettings).toBeUndefined()
      })
    })

    test('다중 형식 동시 내보내기', async () => {
      const exportJob: ExportJob = {
        id: 'export_multi_001',
        title: 'Multi-format Export',
        format: 'multiple',
        prompts: mockPrompts,
        options: {
          formats: ['json', 'csv', 'xml'],
          includeManifest: true
        },
        requestedBy: 'user_test',
        requestedAt: new Date().toISOString()
      }

      const result = await pipeline.executeExport(exportJob)

      expect(result.success).toBe(true)
      expect(result.data.multipleFormats).toBeDefined()
      expect(result.data.multipleFormats.json).toBeDefined()
      expect(result.data.multipleFormats.csv).toBeDefined()
      expect(result.data.multipleFormats.xml).toBeDefined()
      expect(result.data.manifest).toBeDefined()
    })
  })

  describe('가져오기 파이프라인 테스트', () => {
    test('기본 JSON 가져오기', async () => {
      const exportPackage: PromptExportPackage = {
        exportId: 'export_test_001',
        version: '1.0.0',
        metadata: {
          title: 'Test Import Package',
          exportedBy: 'user_test',
          exportedAt: new Date().toISOString(),
          totalPrompts: 2,
          categories: ['storyboard']
        },
        prompts: mockPrompts,
        compatibility: {
          formatVersion: '1.0.0',
          requiredFeatures: ['batch_generation'],
          supportedProviders: ['google', 'openai']
        }
      }

      const importJob: ImportJob = {
        id: 'import_json_001',
        sourceFormat: 'videoplanet',
        sourceData: exportPackage,
        options: {
          validateIntegrity: true,
          overwriteExisting: false,
          preserveIds: true,
          dryRun: false
        },
        conflictResolution: {
          strategy: 'skip_existing',
          customRules: []
        },
        requestedBy: 'user_test',
        requestedAt: new Date().toISOString()
      }

      const result = await pipeline.executeImport(importJob)

      expect(result.success).toBe(true)
      expect(result.data.importedCount).toBe(2)
      expect(result.data.skippedCount).toBe(0)
      expect(result.data.errorCount).toBe(0)
      expect(result.data.conflicts).toHaveLength(0)
      expect(result.integrityReport.valid).toBe(true)
    })

    test('충돌 해결 전략 테스트', async () => {
      // 기존 프롬프트와 ID가 겹치는 상황 시뮬레이션
      const conflictingPrompts = [
        {
          ...mockPrompts[0],
          metadata: {
            ...mockPrompts[0].metadata,
            title: '수정된 제목' // 내용이 다른 같은 ID
          }
        }
      ]

      const exportPackage: PromptExportPackage = {
        exportId: 'export_conflict_001',
        version: '1.0.0',
        metadata: {
          title: 'Conflict Test Package',
          exportedBy: 'user_test',
          exportedAt: new Date().toISOString(),
          totalPrompts: 1,
          categories: ['storyboard']
        },
        prompts: conflictingPrompts,
        compatibility: {
          formatVersion: '1.0.0',
          requiredFeatures: [],
          supportedProviders: ['google']
        }
      }

      // 기존 데이터가 있다고 가정
      pipeline['existingPrompts'] = new Map([
        [mockPrompts[0].id, mockPrompts[0]]
      ])

      const strategies: ConflictResolutionStrategy[] = ['skip_existing', 'overwrite', 'merge', 'rename_new']

      for (const strategy of strategies) {
        const importJob: ImportJob = {
          id: `import_conflict_${strategy}`,
          sourceFormat: 'videoplanet',
          sourceData: exportPackage,
          options: {
            overwriteExisting: strategy === 'overwrite'
          },
          conflictResolution: {
            strategy,
            customRules: []
          },
          requestedBy: 'user_test',
          requestedAt: new Date().toISOString()
        }

        const result = await pipeline.executeImport(importJob)

        expect(result.success).toBe(true)
        
        switch (strategy) {
          case 'skip_existing':
            expect(result.data.skippedCount).toBe(1)
            expect(result.data.importedCount).toBe(0)
            break
          case 'overwrite':
            expect(result.data.importedCount).toBe(1)
            expect(result.data.overwrittenCount).toBe(1)
            break
          case 'merge':
            expect(result.data.importedCount).toBe(1)
            expect(result.data.mergedCount).toBe(1)
            break
          case 'rename_new':
            expect(result.data.importedCount).toBe(1)
            expect(result.data.renamedCount).toBe(1)
            break
        }
      }
    })

    test('외부 형식 가져오기 (OpenAI)', async () => {
      const openAiData = {
        prompts: [
          {
            model: 'dall-e-3',
            prompt: 'A cozy cafe interior with warm lighting, cinematic style',
            size: '1792x1024',
            quality: 'hd',
            style: 'vivid'
          },
          {
            model: 'dall-e-3',
            prompt: 'Two people having a conversation in a cafe, natural lighting',
            size: '1024x1024',
            quality: 'standard',
            style: 'natural'
          }
        ]
      }

      const importJob: ImportJob = {
        id: 'import_openai_001',
        sourceFormat: 'openai',
        sourceData: openAiData,
        options: {
          generateMetadata: true,
          inferStructure: true,
          defaultCategory: 'storyboard'
        },
        fieldMapping: {
          'prompt': 'promptStructure.shotBreakdown[0].generationPrompt',
          'model': 'generationSettings.model',
          'size': 'generationSettings.parameters.aspectRatio'
        },
        requestedBy: 'user_test',
        requestedAt: new Date().toISOString()
      }

      const result = await pipeline.executeImport(importJob)

      expect(result.success).toBe(true)
      expect(result.data.importedCount).toBe(2)
      expect(result.data.convertedFromFormat).toBe('openai')
      
      // 변환된 프롬프트 구조 확인
      expect(result.data.importedPrompts).toBeDefined()
      expect(result.data.importedPrompts[0].generationSettings?.model).toBe('dall-e-3')
      expect(result.data.importedPrompts[0].promptStructure?.shotBreakdown).toBeDefined()
    })

    test('데이터 무결성 검증', async () => {
      // 손상된 데이터로 테스트
      const corruptedData = {
        exportId: 'export_corrupted',
        version: '1.0.0',
        metadata: {
          title: 'Corrupted Package',
          exportedBy: 'user_test',
          exportedAt: 'invalid-date', // 잘못된 날짜 형식
          totalPrompts: 1,
          categories: []
        },
        prompts: [
          {
            id: 'invalid-id-format', // 잘못된 ID 형식
            projectId: '', // 빈 프로젝트 ID
            version: '1.0.0',
            metadata: {
              title: '',
              category: 'invalid_category', // 잘못된 카테고리
              tags: [],
              difficulty: 'easy',
              estimatedTokens: -100 // 음수 토큰
            }
          }
        ],
        compatibility: {
          formatVersion: '1.0.0',
          requiredFeatures: [],
          supportedProviders: []
        }
      }

      const importJob: ImportJob = {
        id: 'import_corrupted_001',
        sourceFormat: 'videoplanet',
        sourceData: corruptedData,
        options: {
          validateIntegrity: true,
          strictValidation: true
        },
        requestedBy: 'user_test',
        requestedAt: new Date().toISOString()
      }

      const result = await pipeline.executeImport(importJob)

      expect(result.success).toBe(false)
      expect(result.integrityReport.valid).toBe(false)
      expect(result.integrityReport.errors.length).toBeGreaterThan(0)
      
      // 구체적인 검증 오류 확인
      const errors = result.integrityReport.errors
      expect(errors.some(e => e.code === 'INVALID_ID_FORMAT')).toBe(true)
      expect(errors.some(e => e.code === 'INVALID_DATE_FORMAT')).toBe(true)
      expect(errors.some(e => e.code === 'INVALID_TOKEN_COUNT')).toBe(true)
    })

    test('배치 처리 성능', async () => {
      const largeBatchData = {
        exportId: 'export_large_batch',
        version: '1.0.0',
        metadata: {
          title: 'Large Batch Import',
          exportedBy: 'user_test',
          exportedAt: new Date().toISOString(),
          totalPrompts: 500,
          categories: ['storyboard']
        },
        prompts: Array(500).fill(null).map((_, index) => ({
          ...mockPrompts[0],
          id: `prompt_batch_${index.toString().padStart(3, '0')}`,
          metadata: {
            ...mockPrompts[0].metadata,
            title: `Batch Prompt ${index + 1}`
          }
        })),
        compatibility: {
          formatVersion: '1.0.0',
          requiredFeatures: [],
          supportedProviders: ['google']
        }
      }

      const importJob: ImportJob = {
        id: 'import_large_batch_001',
        sourceFormat: 'videoplanet',
        sourceData: largeBatchData,
        options: {
          batchSize: 50,
          parallelProcessing: true,
          progressCallback: (progress) => {
            expect(progress.processed).toBeLessThanOrEqual(progress.total)
            expect(progress.percentage).toBeLessThanOrEqual(100)
          }
        },
        requestedBy: 'user_test',
        requestedAt: new Date().toISOString()
      }

      const startTime = performance.now()
      const result = await pipeline.executeImport(importJob)
      const endTime = performance.now()

      expect(result.success).toBe(true)
      expect(result.data.importedCount).toBe(500)
      expect(endTime - startTime).toBeLessThan(5000) // 5초 이내
      expect(result.processingTime).toBeLessThan(5000)
    })

    test('부분 가져오기 및 오류 복구', async () => {
      const mixedQualityData = {
        exportId: 'export_mixed_quality',
        version: '1.0.0',
        metadata: {
          title: 'Mixed Quality Package',
          exportedBy: 'user_test',
          exportedAt: new Date().toISOString(),
          totalPrompts: 3,
          categories: ['storyboard']
        },
        prompts: [
          mockPrompts[0], // 유효한 프롬프트
          {
            ...mockPrompts[1],
            id: 'invalid-id', // 잘못된 ID
            metadata: {
              ...mockPrompts[1].metadata,
              estimatedTokens: -50 // 잘못된 토큰 수
            }
          },
          mockPrompts[1] // 유효한 프롬프트
        ],
        compatibility: {
          formatVersion: '1.0.0',
          requiredFeatures: [],
          supportedProviders: ['google']
        }
      }

      const importJob: ImportJob = {
        id: 'import_mixed_quality_001',
        sourceFormat: 'videoplanet',
        sourceData: mixedQualityData,
        options: {
          allowPartialImport: true,
          maxErrors: 5,
          continueOnError: true
        },
        requestedBy: 'user_test',
        requestedAt: new Date().toISOString()
      }

      const result = await pipeline.executeImport(importJob)

      expect(result.success).toBe(true) // 부분 성공
      expect(result.data.importedCount).toBe(2) // 유효한 2개만 가져오기
      expect(result.data.errorCount).toBe(1) // 1개 오류
      expect(result.data.errors).toHaveLength(1)
      expect(result.integrityReport.partialSuccess).toBe(true)
    })
  })

  describe('성능 최적화 테스트', () => {
    test('스트리밍 처리', async () => {
      const streamingExportJob: ExportJob = {
        id: 'export_streaming_001',
        title: 'Streaming Export',
        format: 'json',
        prompts: Array(2000).fill(mockPrompts[0]),
        options: {
          streamProcessing: true,
          memoryLimit: 100 * 1024 * 1024 // 100MB
        },
        requestedBy: 'user_test',
        requestedAt: new Date().toISOString()
      }

      const result = await pipeline.executeExport(streamingExportJob)

      expect(result.success).toBe(true)
      expect(result.data.streamProcessed).toBe(true)
      expect(result.data.memoryUsage).toBeLessThan(streamingExportJob.options.memoryLimit!)
    })

    test('압축 효율성', async () => {
      const compressionJob: ExportJob = {
        id: 'export_compression_001',
        title: 'Compression Test',
        format: 'json',
        prompts: Array(100).fill(mockPrompts[0]),
        options: {
          compression: 'gzip',
          compressionLevel: 9
        },
        requestedBy: 'user_test',
        requestedAt: new Date().toISOString()
      }

      const result = await pipeline.executeExport(compressionJob)

      expect(result.success).toBe(true)
      expect(result.data.compressionRatio).toBeGreaterThan(3) // 최소 3:1 압축
      expect(result.data.originalSize).toBeGreaterThan(result.data.compressedSize)
    })

    test('메모리 사용량 최적화', async () => {
      const memoryOptimizedJob: ExportJob = {
        id: 'export_memory_001',
        title: 'Memory Optimized Export',
        format: 'json',
        prompts: Array(1000).fill(mockPrompts[0]),
        options: {
          memoryOptimization: true,
          chunkSize: 50,
          garbageCollectionInterval: 100
        },
        requestedBy: 'user_test',
        requestedAt: new Date().toISOString()
      }

      const initialMemory = process.memoryUsage().heapUsed
      const result = await pipeline.executeExport(memoryOptimizedJob)
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      expect(result.success).toBe(true)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // 50MB 미만 증가
    })
  })

  describe('오류 처리 및 복구', () => {
    test('네트워크 타임아웃 복구', async () => {
      // 타임아웃 시뮬레이션을 위한 지연된 프로미스
      const timeoutJob: ExportJob = {
        id: 'export_timeout_001',
        title: 'Timeout Test',
        format: 'json',
        prompts: mockPrompts,
        options: {
          timeout: 100, // 매우 짧은 타임아웃
          retryAttempts: 3,
          retryDelay: 50
        },
        requestedBy: 'user_test',
        requestedAt: new Date().toISOString()
      }

      const result = await pipeline.executeExport(timeoutJob)

      // 타임아웃 발생하지만 재시도를 통해 복구되어야 함
      expect(result.retryCount).toBeGreaterThan(0)
    })

    test('디스크 공간 부족 처리', async () => {
      const largeSizeJob: ExportJob = {
        id: 'export_large_size_001',
        title: 'Large Size Export',
        format: 'json',
        prompts: Array(10000).fill(mockPrompts[0]),
        options: {
          maxFileSize: 1024, // 1KB 제한 (매우 작음)
          fallbackToStreaming: true
        },
        requestedBy: 'user_test',
        requestedAt: new Date().toISOString()
      }

      const result = await pipeline.executeExport(largeSizeJob)

      expect(result.success).toBe(true)
      expect(result.data.fallbackUsed).toBe(true)
      expect(result.data.streamProcessed).toBe(true)
    })

    test('데이터 손상 감지 및 복구', async () => {
      const corruptedJob: ImportJob = {
        id: 'import_corrupted_recovery_001',
        sourceFormat: 'videoplanet',
        sourceData: {
          // 의도적으로 손상된 체크섬
          checksum: 'invalid_checksum',
          data: mockPrompts
        },
        options: {
          validateChecksum: true,
          autoRepair: true,
          backupOriginal: true
        },
        requestedBy: 'user_test',
        requestedAt: new Date().toISOString()
      }

      const result = await pipeline.executeImport(corruptedJob)

      expect(result.integrityReport.checksumValid).toBe(false)
      expect(result.integrityReport.repairAttempted).toBe(true)
      expect(result.data.backupCreated).toBe(true)
    })
  })
})