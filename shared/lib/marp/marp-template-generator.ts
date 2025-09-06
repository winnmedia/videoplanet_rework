/**
 * @fileoverview Marp 템플릿 생성기
 * @description 영상 기획서를 전문적인 Marp PDF로 변환하는 템플릿 엔진
 * @layer shared
 */

import type {
  MarpExportRequest,
  MarpExportOptions,
  FourStagesPlan,
  TwelveShotsPlan,
  VideoShot,
  InsertShot
} from '@/entities/video-planning/model/marp-export.schema'

// ============================
// 타입 정의
// ============================

interface MarpSlideOptions {
  includeInserts: boolean
  includeStoryboard: boolean
}

interface MarpBrandingOptions {
  logo?: string
  colors?: {
    primary?: string
    secondary?: string
    accent?: string
  }
  fonts?: {
    heading?: string
    body?: string
  }
}

// ============================
// Marp 템플릿 생성기 클래스
// ============================

export class MarpTemplateGenerator {
  /**
   * Marp 템플릿 생성
   */
  generate(request: MarpExportRequest): string {
    return generateMarpTemplate(request)
  }

  /**
   * 개별 슬라이드 생성
   */
  generateSlides(
    fourStages: FourStagesPlan,
    twelveShots: TwelveShotsPlan,
    options: MarpSlideOptions
  ): string[] {
    return generateMarpSlides(fourStages, twelveShots, options)
  }

  /**
   * 테마 생성
   */
  createTheme(brandingOptions: MarpBrandingOptions): string {
    return createMarpTheme(brandingOptions)
  }
}

// ============================
// 메인 템플릿 생성 함수
// ============================

/**
 * 완전한 Marp 마크다운 템플릿 생성
 */
export function generateMarpTemplate(request: MarpExportRequest): string {
  const { projectTitle, fourStagesPlan, twelveShotsPlan, options } = request
  
  // 메타데이터 섹션 생성
  const metadata = generateMarpMetadata(options)
  
  // 테마 스타일 생성
  const themeStyles = createMarpTheme(options.brandingOptions)
  
  // 슬라이드 생성
  const slides = generateMarpSlides(fourStagesPlan, twelveShotsPlan, {
    includeInserts: options.includeInserts,
    includeStoryboard: options.includeStoryboard
  })

  // 전체 템플릿 조합
  return [
    metadata,
    themeStyles,
    '',
    '---',
    '',
    generateTitleSlide(projectTitle, twelveShotsPlan.totalDuration),
    '',
    '---',
    '',
    ...slides.map(slide => `${slide}\n\n---\n`)
  ].join('\n').replace(/\n---\n$/, '') // 마지막 구분자 제거
}

// ============================
// 메타데이터 생성
// ============================

/**
 * Marp 메타데이터 생성 (YAML frontmatter)
 */
function generateMarpMetadata(options: MarpExportOptions): string {
  const orientation = options.orientation === 'landscape' ? 'true' : 'false'
  const paginate = options.includePageNumbers ? 'true' : 'false'
  
  return `---
marp: true
theme: ${options.theme}
size: ${options.format}
paginate: ${paginate}
backgroundColor: white
backgroundImage: ""
class: lead
style: |
  section {
    padding: ${options.margins.top}mm ${options.margins.right}mm ${options.margins.bottom}mm ${options.margins.left}mm;
    margin: 0;
    font-family: var(--body-font, 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif);
  }
---`
}

// ============================
// 슬라이드 생성
// ============================

/**
 * 제목 슬라이드 생성
 */
function generateTitleSlide(projectTitle: string, totalDuration: number): string {
  const currentDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return `<!-- _class: title-slide -->

# 📽️ ${projectTitle}

**영상 기획서**

---

**📅 생성일:** ${currentDate}  
**⏱️ 총 길이:** ${totalDuration}초  
**🎯 구성:** 4막 구조 + 12샷 플래닝

---

*이 기획서는 VRidge 영상 기획 위저드로 생성되었습니다.*`
}

/**
 * 모든 슬라이드 생성
 */
export function generateMarpSlides(
  fourStages: FourStagesPlan,
  twelveShots: TwelveShotsPlan,
  options: MarpSlideOptions
): string[] {
  const slides: string[] = []

  // 4단계 구성 슬라이드
  slides.push(generateFourStagesSlide(fourStages))

  // 12개 샷 구성 슬라이드
  slides.push(generateTwelveShotsSlide(twelveShots))

  // 상세 샷 리스트 슬라이드 (6개씩 2페이지)
  const shotPages = generateShotDetailSlides(twelveShots.shots)
  slides.push(...shotPages)

  // 인서트 컷 슬라이드 (옵션)
  if (options.includeInserts && twelveShots.insertShots.length > 0) {
    slides.push(generateInsertShotsSlide(twelveShots.insertShots))
  }

  // 제작 체크리스트 슬라이드
  slides.push(generateProductionChecklistSlide())

  // 부록 슬라이드
  slides.push(generateAppendixSlide())

  return slides
}

/**
 * 4단계 구성 슬라이드 생성
 */
function generateFourStagesSlide(fourStages: FourStagesPlan): string {
  const stageCards = fourStages.stages
    .sort((a, b) => a.order - b.order)
    .map(stage => `
<div class="stage-card stage-${stage.order}">
  <div class="stage-header">
    <h3>${stage.title} 단계</h3>
    <span class="duration">${stage.duration}</span>
  </div>
  <div class="stage-goal">
    <strong>목표:</strong> ${stage.goal}
  </div>
  <div class="stage-content">
    ${stage.content.split('\n').map(line => `<p>${line}</p>`).join('')}
  </div>
</div>`).join('')

  return `<!-- _class: four-stages-slide -->

## 🎯 4단계 구성

<div class="stages-grid">
${stageCards}
</div>

**전체 구성 시간:** ${fourStages.totalDuration}`
}

/**
 * 12개 샷 구성 개요 슬라이드 생성
 */
function generateTwelveShotsSlide(twelveShots: TwelveShotsPlan): string {
  const shotCards = twelveShots.shots
    .slice(0, 12) // 최대 12개
    .map(shot => `
<div class="shot-card shot-${shot.order}">
  <div class="shot-number">샷 ${shot.order.toString().padStart(2, '0')}</div>
  <div class="shot-title">${shot.title}</div>
  <div class="shot-details">
    <span class="shot-type">${shot.shotType}</span>
    <span class="camera-move">${shot.cameraMove}</span>
  </div>
  <div class="shot-duration">${shot.duration}초</div>
</div>`).join('')

  return `<!-- _class: twelve-shots-slide -->

## 🎬 12개 샷 구성 개요

<div class="shot-grid">
${shotCards}
</div>

**총 샷 수:** ${twelveShots.shots.length}개 | **총 길이:** ${twelveShots.totalDuration}초`
}

/**
 * 샷 상세 정보 슬라이드들 생성 (6개씩 분할)
 */
function generateShotDetailSlides(shots: VideoShot[]): string[] {
  const slides: string[] = []
  const shotsPerPage = 6

  for (let i = 0; i < shots.length; i += shotsPerPage) {
    const pageShots = shots.slice(i, i + shotsPerPage)
    const pageNumber = Math.floor(i / shotsPerPage) + 1
    
    slides.push(generateShotDetailPage(pageShots, pageNumber))
  }

  return slides
}

/**
 * 개별 샷 상세 페이지 생성
 */
function generateShotDetailPage(shots: VideoShot[], pageNumber: number): string {
  const shotDetails = shots.map(shot => `
<div class="shot-detail">
  <div class="shot-header">
    <h4>샷 ${shot.order.toString().padStart(2, '0')}: ${shot.title}</h4>
    <span class="shot-duration-badge">${shot.duration}초</span>
  </div>
  
  <!-- TODO(human): 2단 레이아웃 구현 -->
  <div class="shot-layout-two-column">
    <div class="storyboard-section">
      <div class="storyboard-placeholder">
        <div class="placeholder-icon">🎨</div>
        <p>스토리보드 이미지</p>
        <small>${shot.shotType} / ${shot.composition}</small>
      </div>
    </div>
    
    <div class="shot-details-section">
      <div class="technical-info">
        <p><strong>샷 타입:</strong> ${shot.shotType}</p>
        <p><strong>카메라 움직임:</strong> ${shot.cameraMove}</p>
        <p><strong>구도:</strong> ${shot.composition}</p>
        <p><strong>전환:</strong> ${shot.transition}</p>
      </div>
      
      <div class="content-info">
        <p><strong>설명:</strong> ${shot.description}</p>
        ${shot.dialogue ? `<p><strong>대사:</strong> "${shot.dialogue}"</p>` : ''}
        ${shot.subtitle ? `<p><strong>자막:</strong> ${shot.subtitle}</p>` : ''}
        ${shot.audio ? `<p><strong>오디오:</strong> ${shot.audio}</p>` : ''}
      </div>
    </div>
  </div>
  
  ${shot.notes ? `<div class="shot-notes"><strong>참고사항:</strong> ${shot.notes}</div>` : ''}
</div>`).join('')

  // TODO(human): 인서트 요약 섹션 추가
  const insertSummary = `
<div class="insert-summary">
  <h5>📎 인서트 컷 추천</h5>
  <div class="insert-grid">
    <div class="insert-item">클로즈업 샷</div>
    <div class="insert-item">디테일 컷</div>
    <div class="insert-item">리액션 샷</div>
  </div>
</div>`

  return `<!-- _class: shot-details-slide -->

## 🎬 샷 상세 정보 (${pageNumber}/2)

${shotDetails}

${insertSummary}`
}

/**
 * 인서트 샷 슬라이드 생성
 */
function generateInsertShotsSlide(insertShots: InsertShot[]): string {
  const insertCards = insertShots.map((insert, index) => `
<div class="insert-card">
  <h4>인서트 ${index + 1}: ${insert.purpose}</h4>
  <div class="insert-info">
    <p><strong>프레이밍:</strong> ${insert.framing}</p>
    <p><strong>설명:</strong> ${insert.description}</p>
    ${insert.notes ? `<p><strong>참고:</strong> ${insert.notes}</p>` : ''}
  </div>
</div>`).join('')

  return `<!-- _class: insert-shots-slide -->

## 🎨 인서트 컷 추천

${insertCards}

*인서트 컷은 스토리의 감정을 강화하고 시각적 다양성을 제공합니다.*`
}

/**
 * 제작 체크리스트 슬라이드 생성
 */
function generateProductionChecklistSlide(): string {
  return `<!-- _class: checklist-slide -->

## 📋 제작 체크리스트

### 사전 제작 (Pre-Production)
- [ ] 스토리보드 완성
- [ ] 대본 최종 검토 및 승인
- [ ] 촬영 장비 리스트 작성 및 준비
- [ ] 출연진 캐스팅 완료
- [ ] 촬영 위치 섭외 및 허가

### 제작 (Production)
- [ ] 촬영 일정 확정 및 공유
- [ ] 촬영팀 브리핑
- [ ] 장비 세팅 및 테스트
- [ ] 촬영 진행 및 모니터링
- [ ] 일일 러시 확인

### 후반 제작 (Post-Production)
- [ ] 편집 계획 수립
- [ ] 색보정 및 사운드 작업
- [ ] 최종 검토 및 승인
- [ ] 배포 형식별 렌더링
- [ ] 프로젝트 아카이브`
}

/**
 * 부록 슬라이드 생성
 */
function generateAppendixSlide(): string {
  return `<!-- _class: appendix-slide -->

## 📎 부록

### 용어 정의
- **기승전결:** 전통적인 4막 구조로 도입-전개-절정-결말 순서
- **샷:** 카메라가 작동을 시작해서 멈출 때까지의 연속된 장면
- **인서트:** 메인 액션을 보완하는 짧은 삽입 장면

### 제작 참고사항
- 모든 시간은 예상 시간이며 실제 촬영에서 조정 가능
- 날씨나 현장 상황에 따른 대안 계획 필요
- 저작권이 있는 음악 사용 시 별도 라이선스 필요

### 연락처
**VRidge 영상제작팀**  
📧 production@vridge.co.kr  
📞 02-1234-5678

---

*본 기획서는 VRidge 영상 기획 위저드로 생성되었습니다.*`
}

// ============================
// 테마 스타일 생성
// ============================

/**
 * VRidge 전문가 테마 CSS 생성
 */
export function createMarpTheme(brandingOptions: MarpBrandingOptions = {}): string {
  const {
    colors = {
      primary: '#2563eb',
      secondary: '#64748b',
      accent: '#f59e0b'
    },
    fonts = {
      heading: 'Noto Sans KR',
      body: 'Noto Sans KR'
    }
  } = brandingOptions

  return `
<style>
:root {
  --primary-color: ${colors.primary};
  --secondary-color: ${colors.secondary};
  --accent-color: ${colors.accent};
  --heading-font: ${fonts.heading};
  --body-font: ${fonts.body};
  --background-color: #ffffff;
  --text-color: #1e293b;
  --border-color: #e2e8f0;
}

/* 전체 레이아웃 */
section {
  font-family: var(--body-font), -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--text-color);
  line-height: 1.6;
  padding: 2rem;
  margin: 0;
}

/* 타이틀 슬라이드 */
section.title-slide {
  background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
  color: white;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

section.title-slide h1 {
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* 헤딩 스타일 */
h1, h2, h3, h4 {
  font-family: var(--heading-font), -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 700;
  color: var(--primary-color);
  margin-top: 0;
}

h1 {
  font-size: 2.5rem;
  border-bottom: 3px solid var(--primary-color);
  padding-bottom: 0.5rem;
  margin-bottom: 1.5rem;
}

h2 {
  font-size: 2rem;
  margin-bottom: 1.25rem;
}

/* 4단계 그리드 */
.stages-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  margin: 1rem 0;
}

.stage-card {
  background: white;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease;
}

.stage-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
}

.stage-card.stage-1 { border-left: 4px solid #ef4444; }
.stage-card.stage-2 { border-left: 4px solid #f97316; }
.stage-card.stage-3 { border-left: 4px solid #eab308; }
.stage-card.stage-4 { border-left: 4px solid #22c55e; }

.stage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.stage-header h3 {
  margin: 0;
  color: var(--primary-color);
}

.duration {
  background: var(--accent-color);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

.stage-goal {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--secondary-color);
}

/* 12샷 그리드 */
.shot-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin: 1rem 0;
}

.shot-card {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.shot-number {
  background: var(--primary-color);
  color: white;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.shot-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-color);
}

.shot-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.shot-type, .camera-move {
  font-size: 0.75rem;
  color: var(--secondary-color);
}

.shot-duration {
  font-weight: 600;
  color: var(--accent-color);
}

/* 샷 상세 정보 */
.shot-detail {
  background: #f8fafc;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.shot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.shot-duration-badge {
  background: var(--accent-color);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 15px;
  font-size: 0.875rem;
  font-weight: 600;
}

.shot-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 1rem;
}

.shot-notes {
  background: #fef3c7;
  border-left: 4px solid var(--accent-color);
  padding: 1rem;
  border-radius: 0 8px 8px 0;
  font-style: italic;
}

/* 인서트 카드 */
.insert-card {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.insert-card h4 {
  color: #0369a1;
  margin-bottom: 1rem;
}

/* 체크리스트 스타일 */
section.checklist-slide ul {
  list-style: none;
  padding-left: 0;
}

section.checklist-slide li {
  margin-bottom: 0.5rem;
  font-weight: 500;
}

/* 반응형 디자인 */
@media print {
  section {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  .stage-card, .shot-detail, .insert-card {
    page-break-inside: avoid;
    break-inside: avoid;
  }
}

/* A4 landscape 최적화 */
@page {
  size: A4 landscape;
  margin: 0;
}
</style>`
}

// ============================
// 유틸리티 함수들
// ============================

/**
 * 텍스트를 HTML 이스케이프
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * 마크다운 줄바꿈을 HTML로 변환
 */
function markdownToHtml(text: string): string {
  return text
    .split('\n')
    .filter(line => line.trim())
    .map(line => `<p>${escapeHtml(line)}</p>`)
    .join('')
}