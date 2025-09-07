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

// PDF 생성 서비스 (Conditional export to avoid SSR issues)
// Only export when we're in a server environment
export const MarpPdfService = async () => {
  if (typeof window !== 'undefined') {
    throw new Error('MarpPdfService is server-side only');
  }
  const { MarpPdfService } = await import('./marp-pdf-service');
  return MarpPdfService;
};

export const generatePdfFromMarkdown = async (markdown: string, config: any) => {
  if (typeof window !== 'undefined') {
    throw new Error('generatePdfFromMarkdown is server-side only');
  }
  const { generatePdfFromMarkdown } = await import('./marp-pdf-service');
  return generatePdfFromMarkdown(markdown, config);
};

export const createPdfBuffer = async (html: string, config: any) => {
  if (typeof window !== 'undefined') {
    throw new Error('createPdfBuffer is server-side only');
  }
  const { createPdfBuffer } = await import('./marp-pdf-service');
  return createPdfBuffer(html, config);
};

export const validatePdfOutput = async (pdfBuffer: Buffer) => {
  if (typeof window !== 'undefined') {
    throw new Error('validatePdfOutput is server-side only');
  }
  const { validatePdfOutput } = await import('./marp-pdf-service');
  return validatePdfOutput(pdfBuffer);
};

export const createMarpExportResponse = async (result: any, downloadUrl?: string) => {
  if (typeof window !== 'undefined') {
    throw new Error('createMarpExportResponse is server-side only');
  }
  const { createMarpExportResponse } = await import('./marp-pdf-service');
  return createMarpExportResponse(result, downloadUrl);
};

export const getMemoryUsage = async () => {
  if (typeof window !== 'undefined') {
    throw new Error('getMemoryUsage is server-side only');
  }
  const { getMemoryUsage } = await import('./marp-pdf-service');
  return getMemoryUsage();
};

export const logPdfGeneration = async (projectTitle: string, result: any) => {
  if (typeof window !== 'undefined') {
    throw new Error('logPdfGeneration is server-side only');
  }
  const { logPdfGeneration } = await import('./marp-pdf-service');
  return logPdfGeneration(projectTitle, result);
};

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