/**
 * @fileoverview Marp PDF 생성 시스템 공용 인덱스
 * @description 영상 기획서를 고품질 PDF로 변환하는 통합 시스템
 * @layer shared
 */

// 템플릿 생성기
export {
  MarpTemplateGenerator,
  generateMarpTemplate,
  generateMarpSlides,
  createMarpTheme
} from './marp-template-generator'

// PDF 생성 서비스
export {
  MarpPdfService,
  generatePdfFromMarkdown,
  createPdfBuffer,
  validatePdfOutput,
  createMarpExportResponse,
  getMemoryUsage,
  logPdfGeneration
} from './marp-pdf-service'

// PDF 스토리지
export {
  temporaryPdfStorage,
  storePdf,
  getPdf,
  deletePdf,
  cleanupExpiredPdfs
} from './pdf-storage'

// 타입 정의 (re-export)
export type {
  MarpExportOptions,
  MarpExportRequest,
  MarpExportResponse,
  MarpPdfConfig,
  PlanningStage,
  FourStagesPlan,
  VideoShot,
  InsertShot,
  TwelveShotsPlan
} from '@/entities/video-planning/model/marp-export.schema'

// 스키마 유틸리티 (re-export)
export {
  validateMarpExportRequest,
  validatePdfConfig,
  safeMarpExportRequest,
  MarpExportRequestSchema,
  MarpExportResponseSchema,
  MarpPdfConfigSchema
} from '@/entities/video-planning/model/marp-export.schema'