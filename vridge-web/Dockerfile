# 🚀 VRidge 프로덕션 배포용 멀티스테이지 Dockerfile

# ========================================
# Stage 1: Dependencies (의존성 설치)
# ========================================
FROM node:20-alpine AS deps

# 보안을 위한 비루트 사용자 추가
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

# 패키지 파일 복사 (캐시 최적화)
COPY package*.json ./

# PNPM 설치 및 프로덕션 의존성 설치
RUN npm install -g pnpm@10.15.0
RUN pnpm install --prod --frozen-lockfile

# ========================================
# Stage 2: Builder (빌드 단계)
# ========================================  
FROM node:20-alpine AS builder

WORKDIR /app

# 전체 의존성 설치 (빌드용)
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm@10.15.0
RUN pnpm install --frozen-lockfile

# 소스 코드 복사
COPY . .

# 빌드 아규먼트 설정
ARG VERSION
ARG ENVIRONMENT=production

# 환경 변수 설정
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV VERSION=$VERSION
ENV ENVIRONMENT=$ENVIRONMENT

# TypeScript 타입 체크
RUN pnpm run type-check

# Next.js 프로덕션 빌드
RUN pnpm run build

# ========================================
# Stage 3: Production (실행 단계)
# ========================================
FROM node:20-alpine AS production

# 보안 업데이트 및 필수 패키지 설치
RUN apk update && apk upgrade
RUN apk add --no-cache dumb-init

# 비루트 사용자 생성
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

# 프로덕션 의존성 복사
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Next.js 빌드 결과물 복사
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 빌드 정보 파일 생성
ARG VERSION
ARG ENVIRONMENT
RUN echo "{\"version\":\"$VERSION\",\"environment\":\"$ENVIRONMENT\",\"buildTime\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > build-info.json

# 헬스체크 스크립트 추가
COPY scripts/docker-healthcheck.sh ./
RUN chmod +x docker-healthcheck.sh

# 포트 설정
EXPOSE 3000

# 환경 변수 설정
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# 사용자 전환
USER nextjs

# 헬스체크 설정
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=3 \
  CMD ./docker-healthcheck.sh

# 애플리케이션 실행 (dumb-init으로 PID 1 프로세스 관리)
CMD ["dumb-init", "node", "server.js"]

# 레이블 추가 (메타데이터)
LABEL maintainer="VLANET Team <dev@vlanet.net>"
LABEL version=$VERSION
LABEL environment=$ENVIRONMENT
LABEL description="VRidge 영상 제작 플랫폼"
LABEL org.opencontainers.image.source="https://github.com/winnmedia/VLANET"
LABEL org.opencontainers.image.vendor="VLANET"
LABEL org.opencontainers.image.title="VRidge Web"
LABEL org.opencontainers.image.description="차세대 영상 제작 및 협업 플랫폼"