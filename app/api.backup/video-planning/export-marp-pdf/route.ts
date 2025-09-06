/**
 * @fileoverview API Route: Marp PDF 내보내기
 * @description 영상 기획서를 고품질 Marp PDF로 내보내기
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  validateMarpExportRequest,
  safeMarpExportRequest
} from '@/entities/video-planning/model/marp-export.schema'
import { 
  storePdf
} from '@/shared/lib/marp'
import type { 
  MarpExportRequest, 
  MarpExportResponse 
} from '@/entities/video-planning/model/marp-export.schema'

export async function POST(request: NextRequest): Promise<NextResponse<MarpExportResponse>> {
  const startTime = Date.now()
  
  try {
    // 요청 본문 파싱
    const body = await request.json()

    // Zod를 사용한 데이터 검증
    const validation = safeMarpExportRequest(body)
    
    if (!validation.success) {
      return NextResponse.json<MarpExportResponse>({
        success: false,
        error: `입력 데이터 검증 실패: ${validation.error}`
      }, { status: 400 })
    }

    const exportRequest: MarpExportRequest = validation.data

    // PDF 생성 서비스 초기화 (async import)
    const { MarpPdfService, createMarpExportResponse, logPdfGeneration } = await import('@/shared/lib/marp');
    const PdfServiceClass = await MarpPdfService();
    const pdfService = new PdfServiceClass()

    // PDF 생성
    const pdfResult = await pdfService.generateFromExportRequest(exportRequest)

    if (!pdfResult.success || !pdfResult.pdfBuffer) {
      // 생성 실패 로깅
      await logPdfGeneration(exportRequest.projectTitle, pdfResult)
      
      return NextResponse.json<MarpExportResponse>({
        success: false,
        error: pdfResult.error || 'PDF 생성에 실패했습니다.'
      }, { status: 500 })
    }

    // 생성 성공 로깅
    await logPdfGeneration(exportRequest.projectTitle, pdfResult)

    // 임시 파일 저장 및 다운로드 URL 생성
    // 실제 환경에서는 S3, Cloudinary 등에 업로드
    const filename = pdfResult.filename || 'video-planning.pdf'
    const downloadUrl = await saveAndGetDownloadUrl(pdfResult.pdfBuffer, filename)
    
    // 응답 생성
    const response = await createMarpExportResponse(pdfResult, downloadUrl)
    
    return NextResponse.json<MarpExportResponse>(response)

  } catch (error) {
    console.error('Marp PDF export error:', error)
    
    const processingTime = Date.now() - startTime
    console.error(`PDF 생성 실패 (${processingTime}ms):`, error instanceof Error ? error.message : String(error))
    
    return NextResponse.json<MarpExportResponse>({
      success: false,
      error: 'PDF 생성 중 서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

/**
 * PDF 파일 저장 및 다운로드 URL 반환
 * @description 실제 환경에서는 클라우드 스토리지에 업로드
 */
async function saveAndGetDownloadUrl(pdfBuffer: Buffer, filename: string): Promise<string> {
  try {
    // 개발 환경에서는 temporary URL 생성
    // 실제 환경에서는 S3, Cloudinary 등에 업로드 후 URL 반환
    const safeFilename = encodeURIComponent(filename)
    
    // PDF 스토리지에 저장
    const timestamp = storePdf(pdfBuffer, filename)

    return `/api/video-planning/download-pdf/${timestamp}?filename=${safeFilename}`
    
  } catch (error) {
    console.error('PDF 저장 실패:', error)
    throw new Error('PDF 파일 저장에 실패했습니다.')
  }
}

// PDF storage is now handled by the shared module

/**
 * GET 요청 처리 (API 정보 제공)
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    name: 'Marp PDF Export API',
    version: '1.0.0',
    description: '영상 기획서를 고품질 Marp PDF로 변환',
    features: [
      'A4 landscape 형식',
      '마진 0 설정',
      '300 DPI 고품질',
      '한글 폰트 지원',
      '전문적인 브랜딩',
      '4막 구조 + 12샷 플래닝'
    ],
    usage: {
      method: 'POST',
      contentType: 'application/json',
      requiredFields: [
        'projectTitle',
        'fourStagesPlan',
        'twelveShotsPlan',
        'options'
      ]
    },
    examples: {
      request: {
        projectTitle: '브랜드 비디오 기획서',
        options: {
          format: 'A4',
          orientation: 'landscape',
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          includeInserts: true,
          includeStoryboard: false,
          dpi: 300,
          quality: 'high'
        }
      }
    }
  })
}

// PDF storage is now handled by the shared module