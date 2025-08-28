# SideBar 네비게이션 시스템 통합 마이그레이션 가이드

## 개요

이 문서는 SideBar 네비게이션 시스템의 각 서브에이전트 작업물을 FSD 아키텍처 원칙에 따라 안전하게 통합하기 위한 실행 가이드입니다.

## 현재 상황 분석

### 완료된 작업물
1. **SideBar.improved.tsx**: Tailwind CSS 기반 개선 UI
2. **API 시스템**: 동적 서브메뉴 로딩 최적화
3. **테스트 전략**: 포괄적 통합/E2E 테스트 수립

### 식별된 문제점
- **TypeScript 오류**: 142개 타입 오류 (주요 29개 중점 해결 필요)
- **Import 규칙 위반**: 15개 파일에서 상대 경로 import 사용
- **스타일링 혼재**: Sass와 Tailwind CSS 병행 사용
- **API 타입 불일치**: Next.js 15.5 동적 라우트 파라미터 타입 이슈

## 마이그레이션 전략: 스트랭글러 패턴

### Phase 1: 기반 안정화 (우선순위: 긴급)

#### 1.1 타입 오류 해결 (예상 소요: 2-3시간)

**핵심 오류 해결 순서**:

1. **동적 라우트 파라미터 타입 수정**
```typescript
// Before (오류 발생)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {

// After (Next.js 15.5 호환)
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
```

2. **SideBar.modern.tsx pathname null 처리**
```typescript
// Before
const pathname = usePathname()
// pathname 사용 시 null 체크 없음

// After  
const pathname = usePathname()
if (!pathname) return null;
```

3. **MonitoringDashboard 타입 가드 추가**
```typescript
// 차트 데이터 타입 가드 구현
function isChartData(data: unknown): data is ChartData {
  return data !== null && typeof data === 'object' && 'lines' in data;
}
```

#### 1.2 Import 경로 정규화 (예상 소요: 1시간)

**자동화 스크립트 사용**:
```bash
# 상대 경로를 절대 경로로 변환
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from \.\./\.\./\.\./shared|from @shared|g'
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from \.\./\.\./\.\./entities|from @entities|g'
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from \.\./\.\./\.\./features|from @features|g'
```

#### 1.3 ESLint 규칙 적용 및 검증
```bash
# 아키텍처 경계 위반 검사
npx eslint --ext .ts,.tsx . --max-warnings 0

# 자동 수정 가능한 오류 수정
npx eslint --ext .ts,.tsx . --fix
```

### Phase 2: 컴포넌트 통합 (우선순위: 높음)

#### 2.1 SideBar 컴포넌트 단계적 교체

**교체 전략**:
```typescript
// 1단계: 조건부 렌더링으로 점진적 교체
export function SideBar(props: SideBarProps) {
  const useImprovedVersion = process.env.NODE_ENV === 'development' || 
                            props.experimentalFeatures;
  
  return useImprovedVersion ? (
    <SideBarImproved {...props} />
  ) : (
    <SideBarLegacy {...props} />
  );
}

// 2단계: 기능 플래그를 통한 제어
const FEATURE_FLAGS = {
  IMPROVED_SIDEBAR: process.env.NEXT_PUBLIC_FEATURE_IMPROVED_SIDEBAR === 'true'
};
```

#### 2.2 Public API 일관성 확보

**index.ts 파일 정리**:
```typescript
// /widgets/SideBar/index.ts
export { SideBar } from './ui/SideBar'
export { SideBarImproved } from './ui/SideBar.improved' 
export type { 
  SideBarProps,
  SideBarItem, 
  SubMenuItem 
} from './model/types'

// 내부 구현 세부사항은 노출하지 않음
// export { SideBarInternal } from './ui/SideBar.improved' // ❌
```

### Phase 3: 스타일링 통합 (우선순위: 중간)

#### 3.1 Sass → Tailwind CSS 마이그레이션

**변환 매핑 테이블**:
```scss
/* Before: SideBar.module.scss */
.sideBar {
  width: var(--sidebar-width);
  padding: 24px 16px;
  background: $color-white;
}

/* After: Tailwind classes */
className="w-64 px-4 py-6 bg-white"
```

**자동 변환 스크립트**:
```bash
# Sass 변수를 Tailwind 클래스로 변환하는 커스텀 스크립트 작성
node scripts/sass-to-tailwind-converter.js
```

#### 3.2 디자인 토큰 중앙화

**tailwind.config.js 확장**:
```javascript
module.exports = {
  theme: {
    extend: {
      spacing: {
        'sidebar-width': '16rem',
        'sidebar-collapsed': '4rem'
      },
      zIndex: {
        'sidebar': '30',
        'submenu': '40'
      }
    }
  }
}
```

### Phase 4: 테스트 통합 및 검증 (우선순위: 중간)

#### 4.1 기존 테스트 마이그레이션

**테스트 실행 순서**:
```bash
# 1. 단위 테스트 (기존)
npm run test:unit

# 2. 통합 테스트 (신규)
npm run test:integration

# 3. E2E 테스트 (전체 플로우)
npm run test:e2e:navigation
```

#### 4.2 회귀 테스트 자동화

**회귀 테스트 시나리오**:
1. 레거시 SideBar → 개선 SideBar 전환 시 동일한 기능 보장
2. API 응답 구조 변경에 대한 호환성 검증
3. 스타일링 변경이 레이아웃에 미치는 영향 최소화

## 실행 체크리스트

### 마이그레이션 전 준비사항

- [ ] **백업 생성**: 현재 master 브랜치의 완전한 백업
- [ ] **테스트 환경 구축**: 마이그레이션 전용 브랜치 생성
- [ ] **팀 동기화**: 마이그레이션 일정 및 역할 분담 확정
- [ ] **모니터링 설정**: 성능 및 에러 추적 도구 준비

### Phase 1 체크리스트 (기반 안정화)

- [ ] **타입 오류 해결**
  - [ ] 동적 라우트 파라미터 타입 수정 (17개 파일)
  - [ ] SideBar.modern.tsx null 처리 추가
  - [ ] MonitoringDashboard 타입 가드 구현
  - [ ] TypeScript strict 모드 통과 확인

- [ ] **Import 경로 정규화**
  - [ ] 상대 경로 → 절대 경로 자동 변환 실행
  - [ ] ESLint import/order 규칙 통과 확인
  - [ ] 순환 참조 검사 실행

- [ ] **빌드 검증**
  - [ ] `npm run build` 성공 확인
  - [ ] `npm run type-check` 오류 0개 달성
  - [ ] ESLint 경고 0개 달성

### Phase 2 체크리스트 (컴포넌트 통합)

- [ ] **SideBar 컴포넌트 교체**
  - [ ] 조건부 렌더링 구현
  - [ ] 기능 플래그 시스템 구축
  - [ ] A/B 테스트 환경 준비

- [ ] **API 통합 검증**
  - [ ] 기존 API 엔드포인트 호환성 확인
  - [ ] 새로운 서브메뉴 API 통합 테스트
  - [ ] 에러 처리 시나리오 검증

- [ ] **상태 관리 통합**
  - [ ] 레거시 상태와 신규 상태 동기화
  - [ ] Zustand 스토어 마이그레이션
  - [ ] 상태 지속성(persistence) 검증

### Phase 3 체크리스트 (스타일링 통합)

- [ ] **Tailwind CSS 적용**
  - [ ] 기존 Sass 클래스 → Tailwind 클래스 매핑
  - [ ] 디자인 토큰 중앙화 완료
  - [ ] 반응형 디자인 동작 검증

- [ ] **시각적 회귀 테스트**
  - [ ] Chromatic 또는 Percy를 통한 스크린샷 비교
  - [ ] 다양한 브라우저 호환성 검증
  - [ ] 모바일 레이아웃 검증

### Phase 4 체크리스트 (테스트 통합 및 검증)

- [ ] **테스트 스위트 실행**
  - [ ] 모든 단위 테스트 통과 (커버리지 85% 이상)
  - [ ] 통합 테스트 통과 (주요 플로우 100%)
  - [ ] E2E 테스트 통과 (네비게이션 시나리오)

- [ ] **성능 검증**
  - [ ] LCP < 2.5초 달성
  - [ ] INP < 200ms 달성
  - [ ] 번들 크기 10% 이내 증가 제한

- [ ] **접근성 검증**
  - [ ] axe-core 점수 95점 이상
  - [ ] 키보드 네비게이션 완전 지원
  - [ ] 스크린 리더 호환성 검증

## 롤백 계획

### 롤백 트리거 조건

1. **성능 회귀**: 페이지 로딩 시간 20% 이상 증가
2. **기능 회귀**: 주요 네비게이션 플로우 실패
3. **접근성 저하**: axe-core 점수 90점 미만
4. **사용자 피드백**: 심각한 사용성 이슈 보고

### 롤백 절차

```bash
# 1. 즉시 롤백 (긴급상황)
git revert <migration-commit-hash>
npm run build && npm run start

# 2. 부분 롤백 (특정 기능만)
# Feature flag를 통해 문제 기능만 비활성화
export NEXT_PUBLIC_FEATURE_IMPROVED_SIDEBAR=false

# 3. 데이터 무결성 복구
# API 스키마 변경사항이 있는 경우 DB 마이그레이션 롤백
```

## 성공 측정 지표

### 기술적 지표

| 메트릭 | 목표값 | 측정 방법 |
|---------|---------|-----------|
| TypeScript 오류 | 0개 | `tsc --noEmit` |
| ESLint 경고 | 0개 | `eslint --max-warnings 0` |
| 테스트 커버리지 | 85% 이상 | Jest coverage report |
| 번들 크기 증가율 | 10% 이하 | webpack-bundle-analyzer |

### 사용자 경험 지표

| 메트릭 | 목표값 | 측정 방법 |
|---------|---------|-----------|
| LCP (페이지 로딩) | < 2.5초 | Web Vitals |
| INP (반응성) | < 200ms | Web Vitals |
| 접근성 점수 | 95점 이상 | axe-core |
| 사용자 만족도 | 4.5/5.0 이상 | 사용자 설문 |

## 팀 역할 분담

### 개발팀
- **Arthur (Chief Architect)**: 전체 아키텍처 설계 및 검증
- **Benjamin (Backend Lead)**: API 통합 및 데이터 흐름 최적화  
- **Eleanor/Sophia (Frontend Leads)**: UI 컴포넌트 통합 및 스타일링
- **Grace (QA Lead)**: 테스트 전략 실행 및 품질 검증

### 시간 계획
- **Phase 1**: 1일 (기반 안정화)
- **Phase 2**: 2일 (컴포넌트 통합)
- **Phase 3**: 1일 (스타일링 통합)
- **Phase 4**: 1일 (테스트 및 검증)
- **총 예상 소요**: 5 영업일

## 위험 요소 및 대응 방안

| 위험 요소 | 확률 | 영향도 | 대응 방안 |
|-----------|------|--------|-----------|
| 타입 오류 미해결로 빌드 실패 | 중간 | 높음 | TypeScript 4.9로 일시 다운그레이드 옵션 준비 |
| 성능 회귀 발생 | 낮음 | 높음 | Code splitting 및 lazy loading 적용 |
| 접근성 저하 | 낮음 | 중간 | 기존 ARIA 속성 보존 및 추가 테스트 |
| 팀원 학습 곡선 | 높음 | 낮음 | FSD 패턴 워크샵 및 문서화 강화 |

## 참고 자료

- [ADR-0001: SideBar 네비게이션 통합 아키텍처](/home/winnmedia/VLANET/vridge-web/docs/adr/0001-sidebar-navigation-integration-architecture.md)
- [네비게이션 테스트 전략](/home/winnmedia/VLANET/vridge-web/docs/NAVIGATION_TEST_STRATEGY.md)
- [FSD 공식 문서](https://feature-sliced.design/)
- [Tailwind CSS 마이그레이션 가이드](https://tailwindcss.com/docs/upgrading-to-v4)

---

**문서 작성자**: Arthur (Chief Architect)  
**최종 검토**: 2024-12-19  
**다음 업데이트 예정**: 마이그레이션 완료 후