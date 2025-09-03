# CRITICAL: Git 히스토리 보안 복구 실행 계획

## 🚨 보안 위험도 평가 결과

### Git 히스토리 AWS 키 오염 현황
- **상태**: my_settings.py 파일은 삭제됨, 하지만 Git 히스토리에 AWS 키가 영구 보존됨
- **위험도**: CRITICAL (GitHub에서 자동 탐지되어 경고 발생)
- **영향 범위**: 전체 리포지토리 히스토리
- **즉시 조치 필요**: ✅

### 발견된 커밋들
```bash
c0766b1 feat: Remove AWS S3 configuration and add Railway deployment support
3ccba3e fix: Railway 500 에러 해결 - my_settings 의존성 제거
```

## 🔧 즉시 실행 보안 복구 방안

### 방안 1: BFG Repo-Cleaner 사용 (권장)
```bash
# 1. BFG 설치
curl -O https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar

# 2. bare 클론 생성
git clone --mirror https://github.com/your-repo-url.git your-repo.git

# 3. AWS 키가 포함된 파일 완전 제거
java -jar bfg-1.14.0.jar --delete-files my_settings.py your-repo.git

# 4. 히스토리 재작성
cd your-repo.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 5. 강제 푸시
git push --force-with-lease
```

### 방안 2: git filter-repo 사용 (대안)
```bash
# 1. git filter-repo 설치
pip install git-filter-repo

# 2. 파일 완전 제거
git filter-repo --invert-paths --path my_settings.py

# 3. 강제 푸시
git push --force-with-lease --all
```

### 방안 3: git filter-branch 사용 (최후 수단)
```bash
git filter-branch --force --index-filter \\
  'git rm --cached --ignore-unmatch my_settings.py' \\
  --prune-empty --tag-name-filter cat -- --all

git push --force-with-lease --all
```

## ⚠️ 실행 전 필수 체크리스트

### 사전 준비
- [ ] 현재 작업 상태 백업
- [ ] 모든 팀원에게 히스토리 재작성 공지
- [ ] GitHub/GitLab에서 브랜치 보호 규칙 임시 해제
- [ ] AWS 키 즉시 무효화 (AWS IAM Console)

### 실행 후 필수 작업
- [ ] 새로운 AWS 키 생성
- [ ] 환경 변수로 키 관리 (.env.local)
- [ ] .gitignore에 민감 정보 패턴 추가
- [ ] 팀원들에게 새로운 히스토리로 re-clone 요청
- [ ] pre-commit hook 설치 (민감 정보 탐지)

## 🛡️ 재발 방지 시스템

### 1. Pre-commit Hook 설치
```bash
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: detect-private-key
      - id: detect-aws-credentials
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

### 2. GitHub Secret Scanning 강화
```yaml
# .github/workflows/security-scan.yml
name: Security Scan
on: [push, pull_request]
jobs:
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run secret scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD
```

### 3. 환경 변수 관리 표준
```bash
# .env.example (안전한 템플릿)
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
DATABASE_URL=your_database_url_here

# .env.local (실제 값, Git 추적 안됨)
AWS_ACCESS_KEY_ID=AKIA...actual_key...
AWS_SECRET_ACCESS_KEY=actual_secret_key
```

## 📋 실행 순서 (단계별)

### Phase 1: 긴급 보안 조치 (즉시)
1. AWS 콘솔에서 노출된 키 즉시 비활성화
2. 새로운 AWS 키 생성 및 안전한 저장
3. 현재 시스템에서 새 키로 교체 테스트

### Phase 2: 히스토리 정화 (24시간 내)
1. 팀원들에게 작업 중단 및 커밋 금지 공지
2. BFG Repo-Cleaner로 히스토리 정화 실행
3. 강제 푸시로 원격 저장소 업데이트

### Phase 3: 시스템 복구 (48시간 내)  
1. 모든 환경(개발/스테이징/프로덕션)에서 새 키 적용
2. CI/CD 파이프라인 환경 변수 업데이트
3. 배포 테스트 및 기능 검증

### Phase 4: 재발 방지 (1주일 내)
1. Pre-commit hook 및 자동화된 보안 스캔 설치
2. 팀 전체 보안 교육 및 가이드라인 배포
3. 정기적인 보안 감사 프로세스 확립

## 🔄 롤백 계획

만약 히스토리 재작성 과정에서 문제가 발생할 경우:

### 즉시 롤백 절차
```bash
# 1. 백업에서 복구
git clone backup-repo.git recovery-repo
cd recovery-repo

# 2. 새로운 브랜치에서 안전한 작업
git checkout -b security-fix-v2

# 3. 민감 정보만 제거한 새 커밋 생성
rm my_settings.py
git add .
git commit -m "security: Remove AWS credentials permanently"

# 4. 강제 푸시
git push origin security-fix-v2 --force
```

## 📊 모니터링 지표

### 보안 복구 성공 지표
- [ ] GitHub Security Alert 해제됨
- [ ] TruffleHog 스캔 통과 (민감 정보 0건)
- [ ] 모든 환경에서 새 AWS 키로 정상 작동
- [ ] 팀원 전체 새 히스토리로 동기화 완료

### 지속적 모니터링
- 주간 자동 보안 스캔 결과
- Pre-commit hook 차단 통계
- AWS 키 접근 로그 분석
- 민감 정보 유출 탐지 알림

---

**⚠️ 중요**: 이 계획은 즉시 실행되어야 하며, 보안 위험이 지속되는 동안 시스템이 취약한 상태입니다. 모든 단계를 순차적으로 수행하되, 문제 발생 시 즉시 롤백 계획을 실행하세요.