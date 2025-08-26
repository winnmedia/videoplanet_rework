#!/bin/bash
set -e

echo "Starting VRidge Backend..."

# 환경 변수 확인
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is not set"
    exit 1
fi

if [ -z "$REDIS_URL" ]; then
    echo "ERROR: REDIS_URL is not set"
    exit 1
fi

# PostgreSQL 연결 대기
echo "Waiting for PostgreSQL..."
while ! nc -z ${DATABASE_HOST:-localhost} ${DATABASE_PORT:-5432}; do
    sleep 1
done
echo "PostgreSQL is ready!"

# Redis 연결 대기
echo "Waiting for Redis..."
REDIS_HOST=$(echo $REDIS_URL | sed -e 's/redis:\/\///' -e 's/:.*$//')
REDIS_PORT=$(echo $REDIS_URL | sed -e 's/.*://' -e 's/\/.*//')
while ! nc -z ${REDIS_HOST} ${REDIS_PORT:-6379}; do
    sleep 1
done
echo "Redis is ready!"

# 마이그레이션 실행
echo "Running database migrations..."
python manage.py migrate --noinput

# 슈퍼유저 생성 (개발 환경에서만)
if [ "$DJANGO_SETTINGS_MODULE" = "config.settings.development" ]; then
    echo "Creating superuser (if not exists)..."
    python manage.py shell << END
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@vridge.kr', 'admin123')
    print('Superuser created.')
else:
    print('Superuser already exists.')
END
fi

# 정적 파일 수집 (프로덕션 환경)
if [ "$DJANGO_SETTINGS_MODULE" = "config.settings.production" ]; then
    echo "Collecting static files..."
    python manage.py collectstatic --noinput
fi

# 캐시 테이블 생성
echo "Creating cache tables..."
python manage.py createcachetable || true

# 실행 명령 처리
exec "$@"