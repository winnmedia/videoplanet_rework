/**
 * @fileoverview API Route: 기획서 내보내기
 * @description JSON과 Marp PDF 형식으로 기획서 내보내기
 */

import { NextRequest, NextResponse } from 'next/server'

import type { ExportPlanRequest, ExportPlanResponse } from '@/features/video-planning-wizard'

export async function POST(request: NextRequest) {
  try {
    const body: ExportPlanRequest = await request.json()
    const { fourStagesPlan, twelveShotsPlan, options } = body

    // 입력 검증
    if (!fourStagesPlan || !twelveShotsPlan) {
      return NextResponse.json<ExportPlanResponse>({
        success: false,
        downloadUrl: '',
        error: '기획서 데이터가 필요합니다.'
      }, { status: 400 })
    }

    // JSON 내보내기
    if (options.format === 'json') {
      const exportData = {
        projectInfo: {
          title: fourStagesPlan.projectTitle,
          createdAt: new Date().toISOString(),
          exportedAt: new Date().toISOString()
        },
        fourStagesPlan,
        twelveShotsPlan,
        metadata: {
          totalDuration: twelveShotsPlan.totalDuration,
          shotCount: twelveShotsPlan.shots.length,
          includeStoryboard: options.includeStoryboard,
          includeInserts: options.includeInserts
        }
      }

      // 실제 구현에서는 파일 저장 후 다운로드 URL 반환
      const downloadUrl = `/downloads/planning-${Date.now()}.json`
      
      return NextResponse.json<ExportPlanResponse>({
        success: true,
        downloadUrl
      })
    }

    // PDF 내보내기 (Marp 기반)
    if (options.format === 'pdf') {
      // Marp 마크다운 생성
      const marpMarkdown = generateMarpMarkdown(fourStagesPlan, twelveShotsPlan, options)
      
      // 실제 구현에서는 Marp CLI를 호출하여 PDF 생성
      // 현재는 목업 URL 반환
      const downloadUrl = `/downloads/planning-${Date.now()}.pdf`
      
      return NextResponse.json<ExportPlanResponse>({
        success: true,
        downloadUrl
      })
    }

    return NextResponse.json<ExportPlanResponse>({
      success: false,
      downloadUrl: '',
      error: '지원하지 않는 내보내기 형식입니다.'
    }, { status: 400 })

  } catch (error) {
    console.error('Export plan error:', error)
    
    return NextResponse.json<ExportPlanResponse>({
      success: false,
      downloadUrl: '',
      error: '내보내기 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

/**
 * Marp 마크다운 생성 함수
 */
function generateMarpMarkdown(fourStagesPlan: any, twelveShotsPlan: any, options: any): string {
  return `---
marp: true
theme: default
size: A4
paginate: true
style: |
  section {
    padding: 0;
    margin: 0;
  }
  h1 {
    color: #2563eb;
    border-bottom: 3px solid #2563eb;
    padding-bottom: 0.5rem;
  }
  .shot-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }
  .shot-card {
    border: 1px solid #e5e7eb;
    padding: 1rem;
    border-radius: 0.5rem;
  }
---

# 📽️ ${fourStagesPlan.projectTitle}

**영상 기획서**

생성일: ${new Date().toLocaleDateString('ko-KR')}
총 길이: ${twelveShotsPlan.totalDuration}초

---

## 🎯 4단계 구성

${fourStagesPlan.stages.map((stage: any, index: number) => `
### ${stage.title}단계 - ${stage.goal}
**예상 시간:** ${stage.duration}

${stage.content}
`).join('\n')}

---

## 🎬 12개 숏 구성

<div class="shot-grid">

${twelveShotsPlan.shots.map((shot: any) => `
<div class="shot-card">
<h4>샷 ${shot.order}</h4>
<strong>${shot.title}</strong><br>
${shot.shotType} | ${shot.cameraMove}<br>
${shot.duration}초 | ${shot.transition}
</div>
`).join('\n')}

</div>

---

${options.includeInserts ? `
## 🎨 인서트 컷 추천

${twelveShotsPlan.insertShots.map((insert: any, index: number) => `
### 인서트 ${index + 1}: ${insert.purpose}
**프레이밍:** ${insert.framing}
**설명:** ${insert.description}
`).join('\n')}
` : ''}

---

## 📋 제작 체크리스트

- [ ] 스토리보드 완성
- [ ] 대본 최종 검토
- [ ] 촬영 장비 준비
- [ ] 출연진 캐스팅
- [ ] 촬영 일정 확정
- [ ] 후반작업 계획 수립

---

*이 기획서는 VRidge 영상 기획 위저드로 생성되었습니다.*`
}