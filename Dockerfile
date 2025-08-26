# Multi-stage Dockerfile for VRidge Backend
# Stage 1: Builder
FROM python:3.9-slim as builder

# 환경 변수 설정
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VERSION=1.3.0 \
    POETRY_HOME="/opt/poetry" \
    POETRY_VIRTUALENVS_CREATE=false \
    POETRY_NO_INTERACTION=1

# Poetry 경로 추가
ENV PATH="$POETRY_HOME/bin:$PATH"

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Poetry 설치
RUN curl -sSL https://install.python-poetry.org | python3 -

# 작업 디렉토리 설정
WORKDIR /app

# 의존성 파일 복사
COPY pyproject.toml poetry.lock ./

# 의존성 설치
RUN poetry install --no-dev --no-root

# ============================================
# Stage 2: Runtime
FROM python:3.9-slim

# 환경 변수 설정
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

# 런타임 의존성 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    ffmpeg \
    netcat \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 사용자 생성 (보안)
RUN groupadd -r django && useradd -r -g django django

# 작업 디렉토리 생성
WORKDIR /app

# Builder에서 의존성 복사
COPY --from=builder /usr/local/lib/python3.9/site-packages /usr/local/lib/python3.9/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# 애플리케이션 코드 복사
COPY --chown=django:django . .

# 디렉토리 생성 및 권한 설정
RUN mkdir -p /app/static /app/media /app/logs && \
    chown -R django:django /app

# 헬스체크 스크립트 복사
COPY --chown=django:django scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# 정적 파일 수집
RUN python manage.py collectstatic --noinput

# 사용자 전환
USER django

# 포트 노출
EXPOSE 8000

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

# 엔트리포인트
ENTRYPOINT ["docker-entrypoint.sh"]

# 기본 실행 명령
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]