/**
 * @fileoverview API Route: PDF 다운로드
 * @description 생성된 PDF 파일 다운로드 엔드포인트
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPdf, deletePdf } from '@/shared/lib/marp'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params
    const pdfId = parseInt(id, 10)

    // ID 검증
    if (isNaN(pdfId)) {
      return new NextResponse('잘못된 PDF ID입니다.', { status: 400 })
    }

    // 저장된 PDF 검색
    const storedPdf = getPdf(pdfId)
    
    if (!storedPdf) {
      return new NextResponse('PDF 파일을 찾을 수 없거나 만료되었습니다.', { status: 404 })
    }

    // 만료 확인
    if (Date.now() > storedPdf.expiresAt) {
      deletePdf(pdfId)
      return new NextResponse('PDF 파일이 만료되었습니다.', { status: 410 })
    }

    // 쿼리 파라미터에서 파일명 추출
    const url = new URL(request.url)
    const filename = url.searchParams.get('filename') || storedPdf.filename

    // PDF 응답 생성 - Buffer 타입 캐스팅으로 해결
    const response = new Response(storedPdf.buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': storedPdf.buffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }) as NextResponse

    // 다운로드 후 파일 삭제 (선택적)
    // deletePdf(pdfId)

    return response

  } catch (error) {
    console.error('PDF 다운로드 오류:', error)
    
    return new NextResponse('PDF 다운로드 중 오류가 발생했습니다.', { 
      status: 500 
    })
  }
}

/**
 * PDF 메타데이터 조회 (HEAD 요청)
 */
export async function HEAD(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params
    const pdfId = parseInt(id, 10)

    if (isNaN(pdfId)) {
      return new NextResponse(null, { status: 400 })
    }

    const storedPdf = getPdf(pdfId)
    
    if (!storedPdf) {
      return new NextResponse(null, { status: 404 })
    }

    if (Date.now() > storedPdf.expiresAt) {
      deletePdf(pdfId)
      return new NextResponse(null, { status: 410 })
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': storedPdf.buffer.length.toString(),
        'Last-Modified': new Date().toUTCString(),
        'Expires': new Date(storedPdf.expiresAt).toUTCString()
      }
    })

  } catch (error) {
    return new NextResponse(null, { status: 500 })
  }
}