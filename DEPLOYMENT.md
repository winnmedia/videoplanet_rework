# 🚀 VLANET 자동 배포 가이드

## 📋 개요

VLANET 프로젝트는 GitHub Actions를 통한 완전 자동화된 CI/CD 파이프라인을 구축했습니다.

### 🏗️ 아키텍처

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GitHub Repo   │───▶│  GitHub Actions  │───▶│   배포 환경     │
│                 │    │                  │    │                 │
│ - 코드 푸시     │    │ - 빌드 & 테스트 │    │ - Vercel        │
│ - PR 생성       │    │ - 품질 검증     │    │ - Railway       │
│ - 자동 트리거   │    │ - 자동 배포     │    │ - 헬스체크     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🌐 배포 환경

### Frontend (Vercel)
- **URL**: https://vridge-web.vercel.app
- **Framework**: Next.js 15.5
- **자동 배포**: `master` 브랜치 푸시 시
- **환경 변수**: `vercel.json`에서 관리

### Backend (Railway) 
- **URL**: https://videoplanet-backend.up.railway.app
- **Framework**: Django + Daphne
- **자동 배포**: `master` 브랜치 푸시 시
- **환경 변수**: `railway.toml`에서 관리

## 🔧 배포 워크플로우

### 1. 품질 검증 단계
```yaml
Frontend Tests & Build:
├── Node.js 18, 20 매트릭스 테스트
├── ESLint 검사
├── TypeScript 타입 체크
├── Unit 테스트 실행
└── 프로덕션 빌드
```

### 2. 배포 단계
```yaml
Deploy to Vercel:
├── Vercel CLI 설치
├── 환경 정보 동기화
├── 프로덕션 빌드
└── 배포 실행
```

### 3. 검증 단계
```yaml
Smoke Tests:
├── Frontend 헬스체크
├── Backend 헬스체크  
├── 주요 엔드포인트 테스트
└── 배포 상태 보고
```

## ⚙️ GitHub Secrets 설정

아래 secrets를 GitHub 리포지토리에 설정해야 합니다:

### Vercel 관련
```
VERCEL_TOKEN          # Vercel CLI 토큰
VERCEL_ORG_ID         # Vercel 조직 ID  
VERCEL_PROJECT_ID     # Vercel 프로젝트 ID
```

### Railway 관련 (선택사항)
```
RAILWAY_TOKEN         # Railway CLI 토큰 (수동 배포용)
```

## 🚀 자동 배포 트리거

### 1. Master 브랜치 푸시
```bash
git push origin master
```
→ 자동으로 프로덕션 배포 시작

### 2. Pull Request 생성
```bash
git push origin feature/new-feature
# PR 생성 시 배포 URL이 코멘트로 추가됨
```

### 3. 수동 배포
GitHub Actions 탭에서 "Deployment Pipeline" 워크플로우를 수동 실행

## 📊 배포 상태 모니터링

### 실시간 상태 확인
- **Frontend**: https://vridge-web.vercel.app/api/health
- **Backend**: https://videoplanet-backend.up.railway.app/health

### GitHub Actions 대시보드
- 빌드 상태: ✅ 성공 | ❌ 실패
- 배포 로그: 상세 실행 과정 확인 가능
- 품질 메트릭: 테스트 커버리지, 린트 결과

## 🔄 배포 환경별 설정

### Production (Vercel)
```json
{
  "NODE_ENV": "production",
  "NEXT_PUBLIC_API_URL": "https://videoplanet-backend.up.railway.app",
  "NEXT_PUBLIC_BACKEND_URL": "https://videoplanet-backend.up.railway.app"
}
```

### Production (Railway)
```toml
[environments.production]
variables = [
    "DJANGO_SETTINGS_MODULE=config.settings",
    "DEBUG=False",
    "ALLOWED_HOSTS=*.railway.app,*.up.railway.app",
    "CORS_ALLOWED_ORIGINS=https://vridge-web.vercel.app"
]
```

## 🚨 트러블슈팅

### 배포 실패 시 대응
1. **GitHub Actions 로그 확인**
   - Actions 탭 → 실패한 워크플로우 클릭
   - 에러 메시지 확인

2. **일반적인 오류**
   - TypeScript 에러: `npm run type-check` 로컬 실행
   - 빌드 실패: `npm run build` 로컬 테스트
   - 환경 변수: Secrets 설정 확인

3. **긴급 배포**
   ```bash
   # Vercel 수동 배포
   cd vridge-web
   npx vercel --prod
   
   # Railway 수동 배포
   cd vridge_back  
   railway deploy
   ```

## 📈 성능 최적화

### 빌드 캐싱
- Node.js 의존성 캐시
- Next.js 빌드 캐시
- Docker 레이어 캐시

### 배포 속도
- 평균 빌드 시간: ~3분
- 평균 배포 시간: ~2분
- 전체 파이프라인: ~8분

## 🔐 보안 고려사항

### 환경 변수 관리
- ✅ GitHub Secrets 사용
- ✅ 민감한 정보 하드코딩 금지  
- ✅ 프로덕션/개발 환경 분리

### 접근 제어
- ✅ CORS 설정으로 도메인 제한
- ✅ CSP 헤더로 XSS 방지
- ✅ Rate limiting 적용

## 📝 배포 체크리스트

배포 전 확인사항:

- [ ] 모든 테스트 통과
- [ ] TypeScript 컴파일 성공
- [ ] ESLint 검사 통과
- [ ] 빌드 성공
- [ ] 환경 변수 설정 확인
- [ ] CORS 설정 업데이트
- [ ] 헬스체크 엔드포인트 정상

## 🎯 다음 단계

### 개선 계획
1. **E2E 테스트 추가**: Playwright 기반 통합 테스트
2. **성능 모니터링**: Core Web Vitals 추적
3. **알림 시스템**: Slack/Discord 배포 알림
4. **A/B 테스트**: Feature Flag 기반 점진적 배포

---

**마지막 업데이트**: 2025-08-26  
**담당자**: Claude AI & VLANET 개발팀  
**문의**: GitHub Issues 또는 팀 채널