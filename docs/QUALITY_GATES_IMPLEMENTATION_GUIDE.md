# VRidge 품질 게이트 구현 가이드

## 개요

이 문서는 VRidge 프론트엔드의 빌드/배포 오류 방지를 위한 종합적인 품질 게이트 시스템을 설명합니다. 

## 🎯 목표

1. **제로 다운타임**: 품질 문제로 인한 프로덕션 장애 방지
2. **개발자 경험**: 빠른 피드백과 명확한 오류 메시지
3. **자동화**: 수동 검증 최소화 및 일관된 품질 표준 적용
4. **스타일링 일관성**: Tailwind CSS와 레거시 SCSS 간 충돌 방지

## 📋 품질 게이트 구성

### 1단계: Pre-commit Hooks (로컬)

```bash
# 커밋 전 자동 실행
🔍 TypeScript 컴파일 검사
🎨 ESLint FSD 경계 검증
🖼️ Prettier 포맷 검사
🧪 관련 단위 테스트 실행
⚡ 스타일링 충돌 감지
```

### 2단계: CI/CD Pipeline (GitHub Actions)

```yaml
품질 게이트 단계:
1. 코드 품질 (TypeScript, ESLint, Prettier)
2. 스타일링 검증 (Tailwind 규칙, SCSS 제한)
3. 테스트 실행 (Unit, Integration, Contract)
4. 빌드 검증 (Development, Production)
5. 환경 변수 검증 (Zod 스키마)
6. 보안 검사 (Dependency audit)
7. E2E 스모크 테스트
8. 성능 예산 검증 (프로덕션 전용)
```

## 🛠️ 설치 및 설정

### 1. 의존성 설치

```bash
# pnpm이 반드시 사용되어야 함
pnpm install

# Husky 설정 (pre-commit hooks)
pnpm prepare
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 `.env.example`을 참고하여 설정:

```bash
# 필수 환경 변수 (개발)
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_API_URL=https://api.vlanet.net
DATABASE_URL=postgresql://...

# 선택적 환경 변수
NEXT_PUBLIC_ENABLE_DEBUG=true
NEXT_PUBLIC_PERFORMANCE_SAMPLE_RATE=0.1
```

### 3. Git Hooks 활성화

```bash
# Pre-commit hook이 자동으로 활성화됩니다
# 커밋 시 품질 검증이 자동 실행됩니다
git add .
git commit -m "feat(widgets): add new dashboard component"
```

## 📝 개발 워크플로우

### 코드 작성 시

1. **신규 컴포넌트**는 반드시 Tailwind CSS 사용
2. **레거시 컴포넌트** 수정 시 기존 SCSS 유지
3. **FSD 아키텍처** 경계 준수

```typescript
// ✅ 올바른 방식 (신규 컴포넌트)
import { clsx } from 'clsx';

export function NewButton({ variant, children }) {
  return (
    <button 
      className={clsx(
        'px-4 py-2 rounded-md font-medium',
        {
          'bg-primary-500 text-white': variant === 'primary',
          'bg-gray-200 text-gray-900': variant === 'secondary'
        }
      )}
    >
      {children}
    </button>
  );
}

// ❌ 잘못된 방식 (임의 값 사용)
<div className="w-[123px] h-[456px]" />

// ❌ 잘못된 방식 (Styled Components)
const StyledButton = styled.button`
  padding: 1rem;
`;
```

### 커밋 메시지 규칙

```bash
# Conventional Commits 형식
feat(scope): 설명
fix(scope): 설명
docs(scope): 설명

# 예시
feat(widgets): add dashboard performance metrics
fix(entities): resolve user authentication issue
docs(readme): update installation instructions
```

### 브랜치 전략

```bash
# 기능 개발
feature/VR-123-add-video-player

# 버그 수정
fix/VR-456-login-redirect-issue

# 긴급 수정 (품질 게이트 우회 가능)
hotfix/critical-security-patch
```

## 🚨 오류 해결 가이드

### TypeScript 오류

```bash
# 오류 확인
pnpm type-check

# 일반적인 해결 방법
1. any 타입 사용 금지
2. @ts-ignore 사용 금지
3. Zod 스키마로 런타임 검증 추가
```

### ESLint FSD 경계 오류

```bash
# 오류 확인
pnpm lint

# 일반적인 해결 방법
1. Public API (index.ts)를 통한 import만 허용
2. 상위 레이어에서 하위 레이어로만 import
3. 동일 레벨 슬라이스 간 직접 import 금지
```

### 스타일링 충돌 오류

```bash
# Tailwind 임의 값 감지
❌ className="w-[123px]"
✅ className="w-32" (설정된 토큰 사용)

# 새로운 SCSS 파일 감지
❌ 새로운 .scss 파일 생성
✅ Tailwind CSS 클래스 사용

# Styled Components 감지
❌ styled.div``
✅ Tailwind CSS + clsx 사용
```

### 환경 변수 오류

```bash
# Zod 스키마 검증 실패
Environment validation failed: NEXT_PUBLIC_API_URL is required

# 해결 방법
1. .env.local에 필요한 변수 추가
2. .env.example 참고하여 올바른 형식 사용
3. 프로덕션 환경에서는 보안 변수 필수
```

## 🔧 응급 상황 대응

### 긴급 배포 시 (품질 게이트 우회)

```bash
# 환경변수로 임시 우회 (매우 위험!)
export EMERGENCY_BUILD=true
pnpm build

# 또는 CI에서
EMERGENCY_BUILD=true npm run build
```

**⚠️ 경고**: 응급 빌드는 보안 취약점이나 심각한 프로덕션 장애 시에만 사용하세요.

## 📊 모니터링 및 메트릭

### CI/CD 대시보드에서 확인 가능한 메트릭

- 빌드 성공률 (목표: >95%)
- 품질 게이트 통과율
- 테스트 커버리지 (목표: 70% 이상)
- 번들 크기 변화
- 보안 취약점 수

### 로컬 개발에서 확인

```bash
# 전체 품질 검사
pnpm validate

# 빌드 검증 (상세한 분석)
pnpm validate:build

# 테스트 커버리지 확인
pnpm test:coverage
```

## 🎓 팀 가이드라인

### DO (해야 할 것)

1. ✅ 커밋 전 로컬에서 `pnpm validate` 실행
2. ✅ 신규 컴포넌트는 Tailwind CSS 사용
3. ✅ FSD 아키텍처 경계 준수
4. ✅ 환경 변수는 Zod 스키마로 검증
5. ✅ PR 생성 전 모든 품질 게이트 통과 확인

### DON'T (하지 말아야 할 것)

1. ❌ npm, yarn 사용 (pnpm만 사용)
2. ❌ TypeScript any, @ts-ignore 사용
3. ❌ Tailwind 임의 값 (w-[123px]) 사용
4. ❌ 새로운 SCSS 파일 생성
5. ❌ Styled Components 사용
6. ❌ FSD 경계 규칙 위반
7. ❌ 품질 게이트 실패 시 강제 병합

### 코드 리뷰 체크리스트

- [ ] CI/CD 파이프라인 모든 단계 통과
- [ ] TypeScript 컴파일 오류 없음
- [ ] ESLint FSD 경계 규칙 준수
- [ ] 스타일링 일관성 (Tailwind CSS 사용)
- [ ] 테스트 커버리지 기준 충족
- [ ] 환경 변수 검증 통과
- [ ] 보안 취약점 없음

## 🔗 관련 문서

- [FSD 아키텍처 가이드](./FSD_ARCHITECTURE.md)
- [Tailwind CSS 디자인 시스템](./VRIDGE_DESIGN_SYSTEM.md)
- [테스트 전략](./TDD_GREEN_STRATEGY.md)
- [배포 체크리스트](./DEPLOYMENT_CHECKLIST.md)

## ❓ FAQ

### Q: 품질 게이트가 너무 엄격하지 않나요?
A: 초기에는 제한적으로 느껴질 수 있지만, 프로덕션 안정성과 코드 품질을 위해 필수적입니다. 시간이 지나면서 개발 속도는 오히려 향상됩니다.

### Q: 레거시 코드는 어떻게 처리하나요?
A: 레거시 코드는 점진적으로 마이그레이션하며, 기존 SCSS는 유지보수 모드로 관리됩니다. 새로운 기능만 Tailwind CSS를 사용합니다.

### Q: 긴급한 핫픽스가 필요한 경우는?
A: `EMERGENCY_BUILD=true` 환경변수로 품질 게이트를 우회할 수 있지만, 배포 후 즉시 품질 문제를 수정해야 합니다.

---

**마지막 업데이트**: 2025-08-28
**담당자**: QA Lead
**버전**: 1.0.0