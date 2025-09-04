# 크리티컬 결함 수정 계획 (Critical Defect Repair Plan)

## 1. P0 - 즉시 수정 필요 (2-4시간)

### 1.1 테스트 Mock 시스템 수정
**문제**: `vi.mocked(...).mockReturnValue is not a function`
**원인**: Vitest/Jest Mock API 사용법 불일치
**해결**: 
```typescript
// 현재 (잘못됨)
vi.mocked(useParams).mockReturnValue({ id: '1' })

// 수정 후
vi.mocked(useParams).mockImplementation(() => ({ id: '1' }))
```

### 1.2 Playwright Global Setup 생성
**문제**: `Cannot find module './tests/e2e/helpers/global-setup.ts'`
**해결**: 누락된 파일 생성 및 설정 보정

### 1.3 빌드 안정성 강화
**문제**: 네트워크 재시도 및 경고
**해결**: 의존성 캐시 최적화 및 TypeScript 경고 해결

## 2. P1 - 24시간 내 수정 (4-6시간)

### 2.1 서브메뉴 API 안정성 개선
**문제**: API 실패 시 폴백 로직 불일치
**해결**: Circuit Breaker 패턴 적용 및 로딩 상태 관리 개선

### 2.2 네비게이션 상태 관리 단순화
**문제**: Context와 Hook 간 상태 동기화 복잡성
**해결**: Redux Toolkit으로 상태 관리 중앙화

## 3. TDD 기반 수정 절차

### Phase 1: Red (실패 테스트 작성)
1. Mock 시스템 실패 테스트 작성
2. E2E 설정 검증 테스트 작성
3. 빌드 안정성 검증 테스트 작성

### Phase 2: Green (최소 구현)
1. Mock API 수정
2. Global Setup 파일 생성
3. 빌드 최적화 적용

### Phase 3: Refactor (리팩토링)
1. 테스트 커버리지 확장
2. 에러 핸들링 강화
3. 성능 최적화

## 4. 성공 기준 (Definition of Done)

### 기능적 요구사항
- [ ] 모든 단위 테스트 통과 (95% 이상)
- [ ] E2E 스모크 테스트 실행 성공
- [ ] 빌드 프로세스 경고 제로

### 비기능적 요구사항
- [ ] 서브메뉴 반응시간 < 200ms
- [ ] 네비게이션 상태 변경 < 100ms
- [ ] 키보드 네비게이션 완전 지원

### 품질 게이트
- [ ] ESLint 규칙 위반 제로
- [ ] TypeScript 컴파일 에러 제로
- [ ] Accessibility 감사 통과 (axe-core)

## 5. 롤백 계획

### 안전 장치
1. Git 브랜치 격리 (`hotfix/critical-defects`)
2. 단계별 커밋으로 세분화된 롤백 포인트
3. 기존 기능 영향도 최소화

### 롤백 트리거
- 빌드 실패 시 즉시 롤백
- 기존 기능 회귀 감지 시 롤백
- 성능 임계값 위반 시 롤백

## 6. 모니터링 및 알림

### 메트릭
- 테스트 통과율
- 빌드 성공률
- 사용자 워크플로우 완료율

### 알림 설정
- 테스트 실패 즉시 알림
- 성능 회귀 감지 시 알림
- 에러율 임계값 초과 시 알림