# 🚂 Railway 자동 배포 설정 가이드

Railway 백엔드 자동 배포를 위한 두 가지 방법을 제공합니다.

## 방법 1: GitHub Integration (추천)

### 1단계: Railway 프로젝트 연결
1. [Railway Dashboard](https://railway.app/dashboard) 접속
2. "New Project" → "Deploy from GitHub repo" 선택
3. `winnmedia/videoplanet_rework` 저장소 선택
4. `vridge_back` 폴더를 루트로 설정

### 2단계: 환경 변수 설정
Railway Dashboard에서 다음 변수들을 설정:

```bash
# 필수 환경 변수
DJANGO_SETTINGS_MODULE=config.settings
DEBUG=False
ALLOWED_HOSTS=*.railway.app,*.up.railway.app,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://vridge-web.vercel.app,https://videoplanet.vercel.app

# 데이터베이스 (Railway PostgreSQL 플러그인 자동 설정)
DATABASE_URL=(Railway에서 자동 생성)

# Redis (Railway Redis 플러그인 자동 설정)  
REDIS_URL=(Railway에서 자동 생성)

# Django 시크릿 키
SECRET_KEY=your-production-secret-key-here
```

### 3단계: 배포 설정
Railway는 `railway.toml` 파일을 자동으로 감지하고 다음 설정을 적용:

```toml
[build]
builder = "nixpacks"
buildCommand = "pip install -r requirements.txt"

[deploy]
startCommand = "python manage.py collectstatic --noinput && python manage.py migrate --noinput && daphne -b 0.0.0.0 -p $PORT config.asgi:application"
healthcheckPath = "/health/"
```

### 4단계: 자동 배포 활성화
- Railway는 기본적으로 `master` 브랜치의 변경사항을 감지하여 자동 배포
- GitHub 푸시 → Railway 자동 빌드 & 배포

## 방법 2: GitHub Actions + Railway CLI

### 1단계: Railway CLI 토큰 발급
1. Railway Dashboard → Account Settings → Tokens
2. "Create Token" 클릭하여 새 토큰 생성
3. 토큰을 안전하게 복사

### 2단계: GitHub Secrets 설정
GitHub 저장소의 Settings → Secrets에 다음을 추가:

```
RAILWAY_TOKEN=your-railway-token-here
RAILWAY_SERVICE_ID=your-service-id-here
```

### 3단계: 서비스 ID 확인
```bash
# Railway CLI 설치 및 로그인
npm install -g @railway/cli
railway login

# 서비스 ID 확인
railway status
```

## 현재 GitHub Actions 설정

현재 `.github/workflows/deploy.yml`에 다음이 설정됨:

```yaml
deploy-railway:
  name: Deploy to Railway
  runs-on: ubuntu-latest
  needs: build-backend
  
  steps:
  - name: Deploy to Railway
    run: |
      railway login --token ${{ secrets.RAILWAY_TOKEN }}
      railway up --service ${{ secrets.RAILWAY_SERVICE_ID }}
```

## 🔧 추가 설정 옵션

### 데이터베이스 플러그인
Railway Dashboard에서 PostgreSQL 플러그인 추가:
1. Project → Add Plugin → PostgreSQL
2. 자동으로 `DATABASE_URL` 환경 변수 생성

### Redis 플러그인 (선택)
캐시 및 세션 스토어용:
1. Project → Add Plugin → Redis  
2. 자동으로 `REDIS_URL` 환경 변수 생성

### 커스텀 도메인 설정
1. Railway Dashboard → Settings → Domains
2. 커스텀 도메인 추가 및 DNS 설정

## 🚀 배포 확인

배포 완료 후 다음 URL에서 확인:
- **Backend API**: https://your-service.up.railway.app
- **Health Check**: https://your-service.up.railway.app/health/
- **Admin Panel**: https://your-service.up.railway.app/admin/

## 📊 모니터링

### Railway Dashboard
- 실시간 로그 확인
- 리소스 사용량 모니터링
- 배포 히스토리 추적

### 헬스체크 설정
```python
# config/urls_health.py
from django.http import JsonResponse
from django.urls import path

def health_check(request):
    return JsonResponse({
        'status': 'healthy',
        'timestamp': timezone.now().isoformat()
    })

urlpatterns = [
    path('health/', health_check, name='health'),
]
```

## 🔍 트러블슈팅

### 일반적인 문제들

1. **빌드 실패**
   ```bash
   # 로컬에서 요구사항 확인
   pip install -r requirements.txt
   python manage.py check --deploy
   ```

2. **데이터베이스 연결 오류**
   - Railway PostgreSQL 플러그인이 설치되었는지 확인
   - `DATABASE_URL` 환경 변수가 설정되었는지 확인

3. **정적 파일 서빙 문제**
   ```python
   # settings.py
   STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
   STATIC_URL = '/static/'
   ```

### Railway CLI 명령어

```bash
# 로그 확인
railway logs

# 서비스 상태 확인  
railway status

# 환경 변수 확인
railway variables

# 로컬 개발용 환경 변수 연결
railway run python manage.py runserver
```

## 📝 체크리스트

배포 전 확인사항:
- [ ] `requirements.txt` 최신 상태
- [ ] `railway.toml` 설정 완료
- [ ] 환경 변수 모두 설정
- [ ] 데이터베이스 플러그인 설치
- [ ] CORS 설정에 프론트엔드 도메인 추가
- [ ] 헬스체크 엔드포인트 작동 확인

---

**업데이트**: 2025-08-26  
**Railway 연결 상태**: 설정 완료  
**자동 배포**: GitHub 푸시 시 자동 트리거