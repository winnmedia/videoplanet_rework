# VRidge 오류 방지 체크리스트

## 🚨 프로덕션 배포 전 필수 검증

### 1. 빌드 검증 ✅

- [ ] `pnpm build` 성공 (오류 없음)
- [ ] `pnpm type-check` 통과
- [ ] `pnpm lint` 통과 (경고 0개)
- [ ] `pnpm test:ci` 모든 테스트 통과
- [ ] Bundle 크기 예산 초과 없음
- [ ] 환경 변수 Zod 검증 통과

### 2. 스타일링 일관성 ✅

- [ ] Tailwind 임의 값 사용 없음
- [ ] 새로운 SCSS 파일 생성 없음
- [ ] Styled Components 사용 없음
- [ ] CSS-in-JS 라이브러리 사용 없음
- [ ] 디자인 토큰 준수

### 3. FSD 아키텍처 경계 ✅

- [ ] 상향 의존성 없음
- [ ] Public API를 통한 import만 사용
- [ ] 슬라이스 간 직접 import 없음
- [ ] 순환 의존성 없음

### 4. TypeScript 타입 안전성 ✅

- [ ] `any` 타입 사용 없음
- [ ] `@ts-ignore` 사용 없음
- [ ] `@ts-nocheck` 사용 없음
- [ ] 모든 환경 변수 타입 정의
- [ ] API 응답 Zod 스키마 검증

### 5. 테스트 커버리지 ✅

- [ ] 핵심 기능 90% 이상 커버리지
- [ ] 전체 프로젝트 70% 이상 커버리지
- [ ] E2E 스모크 테스트 통과
- [ ] MSW 모킹 정상 동작
- [ ] 플래키 테스트 0개

## 🔧 개발 환경 설정 검증

### 패키지 매니저 ✅

- [ ] `pnpm` 사용 확인
- [ ] `package-lock.json` 삭제됨
- [ ] `yarn.lock` 삭제됨
- [ ] `pnpm-lock.yaml` 존재

### Git Hooks ✅

- [ ] Husky 설치됨
- [ ] Pre-commit hook 활성화
- [ ] Commit message 검증 활성화
- [ ] Lint-staged 설정 정상

### 환경 변수 ✅

- [ ] `.env.example` 최신화
- [ ] 프로덕션 필수 변수 정의
- [ ] Zod 스키마 검증 활성화
- [ ] 보안 변수 Git 추적 제외

## 🚀 배포 환경별 체크리스트

### Development ✅

- [ ] 로컬 개발 서버 정상 실행
- [ ] HMR (Hot Module Replacement) 동작
- [ ] DevTools 접근 가능
- [ ] Debug 모드 활성화

### Staging ✅

- [ ] 프로덕션과 동일한 빌드 설정
- [ ] NEXTAUTH_SECRET 설정
- [ ] 외부 API 연결 확인
- [ ] E2E 테스트 전체 통과

### Production ✅

- [ ] `NODE_ENV=production` 설정
- [ ] 모든 필수 환경변수 설정
- [ ] HTTPS 강제 활성화
- [ ] 보안 헤더 적용
- [ ] Error Monitoring 활성화
- [ ] Performance Monitoring 활성화

## ⚡ Next.js 특화 검증

### 빌드 최적화 ✅

- [ ] Static Generation 최대 활용
- [ ] Image Optimization 설정
- [ ] Bundle Splitting 정상 동작
- [ ] Tree Shaking 적용
- [ ] Minification 활성화

### Runtime 검증 ✅

- [ ] 클라이언트 하이드레이션 오류 없음
- [ ] SSR/SSG 페이지 정상 렌더링
- [ ] API Routes 정상 동작
- [ ] Middleware 정상 실행

### 성능 예산 ✅

- [ ] LCP < 2.5s
- [ ] INP < 200ms
- [ ] CLS < 0.1
- [ ] FCP < 1.8s
- [ ] TTI < 3.8s

## 🔒 보안 검증

### 의존성 보안 ✅

- [ ] `pnpm audit` 중대한 취약점 없음
- [ ] 알려진 악성 패키지 없음
- [ ] 최신 보안 패치 적용
- [ ] 불필요한 의존성 제거

### 환경 보안 ✅

- [ ] API 키 환경변수로 관리
- [ ] 민감 정보 Git 추적 제외
- [ ] CORS 설정 적절히 제한
- [ ] CSP 헤더 적용

## 📱 크로스 브라우저/디바이스 검증

### 브라우저 호환성 ✅

- [ ] Chrome (최신, 이전 버전)
- [ ] Firefox (최신)
- [ ] Safari (최신)
- [ ] Edge (최신)

### 반응형 디자인 ✅

- [ ] 모바일 (375px~)
- [ ] 태블릿 (768px~)
- [ ] 데스크톱 (1024px~)
- [ ] 대형 화면 (1440px+)

### 접근성 검증 ✅

- [ ] axe-core 검사 통과
- [ ] 키보드 네비게이션 가능
- [ ] 스크린 리더 호환
- [ ] 색상 대비 기준 충족
- [ ] ARIA 속성 적절히 사용

## 🚨 응급 상황 대응

### 긴급 배포 시 ✅

- [ ] `EMERGENCY_BUILD=true` 환경변수 설정 확인
- [ ] 품질 게이트 우회 사유 문서화
- [ ] 배포 후 즉시 품질 문제 수정 계획
- [ ] 모니터링 강화
- [ ] 롤백 계획 준비

### 모니터링 준비 ✅

- [ ] Error tracking 활성화
- [ ] Performance monitoring 활성화
- [ ] 알림 설정 확인
- [ ] 대시보드 접근 가능
- [ ] 로그 수집 정상 동작

## 📋 마지막 점검

### 팀 커뮤니케이션 ✅

- [ ] 배포 일정 팀 공유
- [ ] 변경 사항 문서화
- [ ] 롤백 절차 확인
- [ ] 담당자 연락처 최신화

### 사후 확인 계획 ✅

- [ ] 배포 후 모니터링 계획
- [ ] 사용자 피드백 수집 방법
- [ ] 성능 메트릭 추적 계획
- [ ] 이슈 대응 프로세스 확인

---

## ✅ 전체 검증 스크립트

```bash
#!/bin/bash
echo "🔍 VRidge 배포 전 전체 검증 시작..."

# 1. 패키지 매니저 확인
if [ ! -f "pnpm-lock.yaml" ]; then
  echo "❌ pnpm-lock.yaml not found!"
  exit 1
fi

# 2. 의존성 설치 및 검증
pnpm install --frozen-lockfile
pnpm audit --audit-level moderate

# 3. 품질 게이트 실행
pnpm validate
pnpm validate:build

# 4. 테스트 실행
pnpm test:ci
pnpm test:e2e:smoke

# 5. 빌드 검증
pnpm build

# 6. 배포 준비 완료
echo "✅ 모든 검증이 완료되었습니다!"
echo "🚀 배포를 진행할 수 있습니다."
```

---

**체크리스트 버전**: 1.0.0  
**마지막 업데이트**: 2025-08-28  
**다음 리뷰 예정일**: 2025-09-28