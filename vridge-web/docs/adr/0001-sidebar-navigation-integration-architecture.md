# ADR-0001: SideBar 네비게이션 시스템 통합 아키텍처

## 상태 (Status)
**승인됨** - 2024-12-19

## 배경 (Context)

VideoPlanet 프로젝트에서 SideBar 네비게이션 시스템이 다음과 같은 여러 서브에이전트에 의해 개선되었습니다:

- **frontend-ui-sophia**: UI/UX 개선 및 접근성 강화
- **backend-lead-benjamin**: API 시스템 구현 및 데이터 흐름 최적화  
- **qa-lead-grace**: 포괄적 테스트 전략 수립

이들 작업물을 FSD(Feature-Sliced Design) 아키텍처 원칙에 따라 통합하고, 장기적 확장성을 보장하는 아키텍처 결정이 필요합니다.

## 결정 (Decision)

### 1. 아키텍처 레이어링

**채택**: Feature-Sliced Design (FSD) 레이어링 엄격 준수
- `widgets/SideBar` - 네비게이션 위젯 (UI 조합 계층)
- `features/navigation` - 네비게이션 기능 (비즈니스 로직)  
- `entities/menu` - 메뉴 도메인 모델 (도메인 계층)
- `shared/ui` - 공통 UI 컴포넌트 (인프라 계층)

**근거**: 
- 단일 책임 원칙에 따른 관심사 분리
- 독립적 테스트 가능성 확보
- 모듈 간 의존성 제어로 순환 참조 방지

### 2. 이원화된 컴포넌트 구조

**채택**: 레거시와 개선 버전 병행 운영
```
/widgets/SideBar/ui/
├── SideBar.tsx           # 레거시 버전 (Sass 기반)
├── SideBar.improved.tsx  # 개선 버전 (Tailwind 기반)
├── SideBar.modern.tsx    # 현대화 버전 (React 19)
```

**근거**:
- 스트랭글러 패턴(Strangler Fig Pattern) 적용
- 점진적 마이그레이션을 통한 위험 최소화
- 기존 기능의 안정성 유지

### 3. 타입 안전성 강제

**채택**: 엄격한 TypeScript 5.7 + Zod 런타임 검증
```typescript
// entities/menu/model/types.ts
export interface MenuItem {
  id: string
  label: string  
  path: string
  icon: string
  activeIcon: string
  hasSubMenu?: boolean
  count?: number
}

// 런타임 검증
const MenuItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  path: z.string(),
  // ...
})
```

**근거**:
- 컴파일 타임 + 런타임 이중 검증으로 견고성 확보
- API 응답 데이터의 구조적 무결성 보장
- 타입 안전성과 개발자 경험(DX) 동시 향상

### 4. 스타일링 마이그레이션 전략

**채택**: Tailwind CSS 우선, Sass 단계적 제거
- **신규 코드**: 모든 신규 컴포넌트는 Tailwind CSS 사용 강제
- **레거시 코드**: Sass Modules는 유지보수 모드로 전환
- **임의 값 금지**: Tailwind에서 `w-[123px]` 같은 arbitrary values 금지
- **디자인 토큰**: `tailwind.config.js`에 모든 디자인 토큰 중앙 관리

**근거**:
- 일관된 디자인 시스템 구축
- 개발 생산성 향상 및 번들 크기 최적화
- 유지보수성과 확장성 개선

### 5. 아키텍처 경계 강제

**채택**: ESLint + Boundaries 플러그인을 통한 자동화된 경계 강제
```javascript
// eslint.config.mjs 핵심 규칙
{
  "no-restricted-imports": [
    "error", 
    {
      patterns: [
        {
          group: ["@features/*/*"],
          message: "Direct cross-imports between features are forbidden. Use public API exports."
        }
      ]
    }
  ]
}
```

**근거**:
- FSD 레이어 간 의존성 규칙 자동 검증
- 개발자 실수로 인한 아키텍처 위반 사전 차단
- CI/CD 파이프라인에서 아키텍처 품질 게이트 구현

### 6. 테스트 전략 계층화

**채택**: 테스트 피라미드 기반 계층별 테스트 전략
- **Unit Tests**: `entities`, `shared` 레이어 (90% 커버리지)
- **Integration Tests**: `features`, `widgets` 레이어 (80% 커버리지) 
- **E2E Tests**: 전체 네비게이션 플로우 (주요 시나리오 100%)

**근거**:
- 각 레이어 특성에 맞는 테스트 전략 적용
- TDD(Test-Driven Development) 원칙 준수
- MSW(Mock Service Worker)를 통한 일관된 API 모킹

## 영향 (Consequences)

### 긍정적 영향

1. **모듈성 향상**: 각 레이어의 책임 명확화로 코드 이해도 증가
2. **테스트 용이성**: 의존성 절단으로 단위 테스트 작성 용이
3. **확장성**: 새로운 네비게이션 기능 추가 시 기존 코드 영향 최소화
4. **개발자 경험**: TypeScript 엄격 모드 + 자동화된 검증으로 실수 방지
5. **성능**: Tailwind CSS와 React 19의 최적화 이점 활용

### 부정적 영향

1. **학습 곡선**: 개발팀의 FSD 패턴 학습 필요
2. **마이그레이션 복잡성**: 레거시 코드와 신규 코드 병행 관리 필요
3. **초기 설정 비용**: ESLint 규칙, 테스트 환경 구축 시간 소요

### 위험 요소 및 완화 방안

| 위험 요소 | 확률 | 영향도 | 완화 방안 |
|-----------|------|---------|-----------|
| 마이그레이션 중 기능 회귀 | 중간 | 높음 | 포괄적 회귀 테스트 + 단계적 배포 |
| 개발 생산성 일시적 저하 | 높음 | 중간 | 팀 교육 + 점진적 도입 |
| 아키텍처 규칙 위반 | 중간 | 중간 | 자동화된 ESLint 검증 + 코드 리뷰 |

## 구현 로드맵

### Phase 1: 기반 구축 (완료)
- [x] FSD 레이어 구조 정립
- [x] ESLint 아키텍처 경계 규칙 설정
- [x] 개선된 SideBar 컴포넌트 구현

### Phase 2: 안정화 (진행 중)
- [ ] TypeScript 타입 오류 해결 (142개 오류 식별됨)
- [ ] Public API 인덱스 파일 정리
- [ ] 상대 경로 import를 절대 경로로 마이그레이션

### Phase 3: 확장 (예정)
- [ ] 모든 레거시 Sass 코드를 Tailwind로 마이그레이션
- [ ] 성능 최적화 (Code Splitting, Lazy Loading)
- [ ] 접근성 개선 사항 전체 적용

## 모니터링 지표

다음 지표를 통해 결정의 효과성을 지속적으로 측정:

1. **코드 품질**:
   - TypeScript 타입 오류 수: 목표 0개
   - ESLint 위반 사항: 목표 0개
   - 테스트 커버리지: 목표 85% 이상

2. **개발 생산성**:
   - 네비게이션 기능 개발 시간 단축 비율
   - 코드 리뷰 소요 시간 감소 비율

3. **사용자 경험**:
   - 페이지 로딩 시간: 목표 3초 이내
   - 접근성 점수: 목표 95점 이상 (axe-core 기준)

4. **시스템 안정성**:
   - 네비게이션 관련 버그 발생률
   - 프로덕션 에러 로그 건수

## 관련 문서

- [네비게이션 테스트 전략](/home/winnmedia/VLANET/vridge-web/docs/NAVIGATION_TEST_STRATEGY.md)
- [FSD 가이드라인](/home/winnmedia/VLANET/CLAUDE.md#part-2-아키텍처---fsd--클린-아키텍처-architecture)
- [ESLint 설정](/home/winnmedia/VLANET/vridge-web/eslint.config.mjs)

---

**문서 작성자**: Arthur (Chief Architect)  
**검토자**: Benjamin (Backend Lead), Sophia (Frontend UI Lead), Grace (QA Lead)  
**승인 날짜**: 2024-12-19  
**다음 검토 예정일**: 2025-01-19