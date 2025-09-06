/**
 * @fileoverview Marp PDF Export Zod 스키마
 * @description 영상 기획서를 Marp PDF로 내보내기 위한 타입 안전 스키마 정의
 * @layer entities
 */

import { z } from 'zod'

// ============================
// 기본 타입 스키마
// ============================

/**
 * PDF 페이지 형식 스키마
 */
export const PageFormatSchema = z.enum(['A3', 'A4', 'A5', 'Legal', 'Letter', 'Tabloid'])

/**
 * PDF 페이지 방향 스키마  
 */
export const PageOrientationSchema = z.enum(['portrait', 'landscape'])

/**
 * PDF 품질 스키마
 */
export const PdfQualitySchema = z.enum(['low', 'medium', 'high', 'ultra'])

/**
 * 마진 설정 스키마
 */
export const MarginsSchema = z.object({
  top: z.number().min(0).default(0),
  bottom: z.number().min(0).default(0),
  left: z.number().min(0).default(0),
  right: z.number().min(0).default(0)
})

// ============================
// Marp 내보내기 옵션 스키마
// ============================

/**
 * Marp PDF 내보내기 옵션 스키마
 * @description A4 landscape, zero margins, 300 DPI 기본값
 */
export const MarpExportOptionsSchema = z.object({
  // 페이지 설정
  format: PageFormatSchema.default('A4'),
  orientation: PageOrientationSchema.default('landscape'),
  margins: MarginsSchema.default({ top: 0, bottom: 0, left: 0, right: 0 }),
  
  // 품질 설정
  dpi: z.number().min(72).max(600).default(300),
  quality: PdfQualitySchema.default('high'),
  
  // 테마 및 스타일
  theme: z.enum(['vridge-professional-light', 'vridge-professional-dark']).default('vridge-professional-light'),
  
  // 내용 옵션
  includePageNumbers: z.boolean().default(true),
  includeMetadata: z.boolean().default(true),
  includeInserts: z.boolean().default(true),
  includeStoryboard: z.boolean().default(false),
  
  // 브랜딩
  brandingOptions: z.object({
    logo: z.string().optional(),
    colors: z.object({
      primary: z.string().default('#2563eb'),
      secondary: z.string().default('#64748b'),
      accent: z.string().default('#f59e0b')
    }).default({}),
    fonts: z.object({
      heading: z.string().default('Noto Sans KR'),
      body: z.string().default('Noto Sans KR')
    }).default({})
  }).default({})
})

// ============================
// 영상 기획 데이터 스키마
// ============================

/**
 * 기획 단계 스키마
 */
export const PlanningStageSchema = z.object({
  id: z.string(),
  title: z.string().min(1, '제목은 필수입니다'),
  content: z.string().min(1, '내용은 필수입니다'),
  goal: z.string().min(1, '목표는 필수입니다'),
  duration: z.string().min(1, '시간은 필수입니다'),
  order: z.number().min(1).max(4)
})

/**
 * 4단계 기획 스키마
 */
export const FourStagesPlanSchema = z.object({
  id: z.string(),
  projectTitle: z.string().min(1, '프로젝트 제목은 필수입니다'),
  stages: z.array(PlanningStageSchema).length(4, '정확히 4개의 단계가 필요합니다'),
  totalDuration: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

/**
 * 비디오 샷 스키마
 */
export const VideoShotSchema = z.object({
  id: z.string(),
  order: z.number().min(1).max(12),
  title: z.string().min(1, '샷 제목은 필수입니다'),
  description: z.string().min(1, '샷 설명은 필수입니다'),
  shotType: z.enum(['익스트림 롱샷', '롱샷', '미디엄샷', '클로즈업', '익스트림 클로즈업', '와이드샷', '버드아이뷰', '웜즈아이뷰']),
  cameraMove: z.enum(['고정', '팬', '틸트', '줌인', '줌아웃', '트래킹', '크레인샷', '핸드헬드']),
  composition: z.enum(['정면', '측면', '비스듬', '백샷', '오버 숄더', '3분의 1 법칙', '대칭', '비대칭']),
  duration: z.number().min(0.1, '지속시간은 0.1초 이상이어야 합니다'),
  dialogue: z.string().default(''),
  subtitle: z.string().default(''),
  audio: z.string().default(''),
  transition: z.enum(['컷', '디졸브', '페이드인', '페이드아웃', '와이프', '점프컷', '매치컷', '크로스컷']),
  storyboardUrl: z.string().url().optional(),
  notes: z.string().optional(),
  visualStyle: z.string().optional(),
  cameraWork: z.string().optional(),
  aiGenerated: z.boolean().default(false),
  imagePrompt: z.string().optional(),
  imageUrl: z.string().url().optional()
})

/**
 * 인서트 샷 스키마
 */
export const InsertShotSchema = z.object({
  id: z.string(),
  purpose: z.string().min(1, '목적은 필수입니다'),
  description: z.string().min(1, '설명은 필수입니다'),
  framing: z.string().min(1, '프레이밍은 필수입니다'),
  notes: z.string().optional(),
  imageUrl: z.string().url().optional()
})

/**
 * 12개 샷 기획 스키마
 */
export const TwelveShotsPlanSchema = z.object({
  id: z.string(),
  projectTitle: z.string().min(1, '프로젝트 제목은 필수입니다'),
  shots: z.array(VideoShotSchema).max(12, '최대 12개의 샷만 허용됩니다'),
  insertShots: z.array(InsertShotSchema).default([]),
  totalDuration: z.number().min(1, '총 지속시간은 1초 이상이어야 합니다'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

// ============================
// 메인 내보내기 요청 스키마
// ============================

/**
 * Marp PDF 내보내기 요청 스키마
 */
export const MarpExportRequestSchema = z.object({
  projectTitle: z.string().min(1, '프로젝트 제목은 필수입니다'),
  fourStagesPlan: FourStagesPlanSchema,
  twelveShotsPlan: TwelveShotsPlanSchema,
  options: MarpExportOptionsSchema.default({})
}).refine(
  (data) => data.fourStagesPlan.projectTitle === data.twelveShotsPlan.projectTitle,
  {
    message: '4단계 기획과 12샷 기획의 프로젝트 제목이 일치해야 합니다',
    path: ['projectTitle']
  }
)

/**
 * Marp PDF 내보내기 응답 스키마
 */
export const MarpExportResponseSchema = z.object({
  success: z.boolean(),
  downloadUrl: z.string().url().optional(),
  filename: z.string().optional(),
  fileSize: z.number().min(0).optional(),
  expiresAt: z.string().datetime().optional(),
  error: z.string().optional(),
  metadata: z.object({
    generatedAt: z.string().datetime(),
    processingTimeMs: z.number().min(0),
    pageCount: z.number().min(1),
    pdfSize: z.object({
      width: z.number().min(0),
      height: z.number().min(0)
    })
  }).optional()
})

// ============================
// Puppeteer PDF 설정 스키마
// ============================

/**
 * Puppeteer PDF 생성 설정 스키마
 */
export const MarpPdfConfigSchema = z.object({
  format: PageFormatSchema.default('A4'),
  landscape: z.boolean().default(true),
  margin: z.object({
    top: z.string().default('0mm'),
    bottom: z.string().default('0mm'), 
    left: z.string().default('0mm'),
    right: z.string().default('0mm')
  }).default({}),
  printBackground: z.boolean().default(true),
  preferCSSPageSize: z.boolean().default(false),
  displayHeaderFooter: z.boolean().default(false),
  headerTemplate: z.string().default(''),
  footerTemplate: z.string().default(''),
  scale: z.number().min(0.1).max(2.0).default(1.0),
  timeout: z.number().min(1000).max(120000).default(30000)
})

// ============================
// 타입 추출
// ============================

export type MarpExportOptions = z.infer<typeof MarpExportOptionsSchema>
export type MarpExportRequest = z.infer<typeof MarpExportRequestSchema>
export type MarpExportResponse = z.infer<typeof MarpExportResponseSchema>
export type MarpPdfConfig = z.infer<typeof MarpPdfConfigSchema>
export type PlanningStage = z.infer<typeof PlanningStageSchema>
export type FourStagesPlan = z.infer<typeof FourStagesPlanSchema>
export type VideoShot = z.infer<typeof VideoShotSchema>
export type InsertShot = z.infer<typeof InsertShotSchema>
export type TwelveShotsPlan = z.infer<typeof TwelveShotsPlanSchema>

// ============================
// 유틸리티 함수
// ============================

/**
 * Marp 내보내기 요청 검증 함수
 */
export const validateMarpExportRequest = (data: unknown): MarpExportRequest => {
  return MarpExportRequestSchema.parse(data)
}

/**
 * PDF 설정 검증 함수
 */
export const validatePdfConfig = (data: unknown): MarpPdfConfig => {
  return MarpPdfConfigSchema.parse(data)
}

/**
 * 안전한 내보내기 요청 검증 (에러 처리 포함)
 */
export const safeMarpExportRequest = (data: unknown) => {
  const result = MarpExportRequestSchema.safeParse(data)
  
  if (!result.success) {
    return {
      success: false as const,
      error: result.error.message,
      issues: result.error.issues
    }
  }
  
  return {
    success: true as const,
    data: result.data
  }
}