# Railway 강제 Node.js 빌드를 위한 Dockerfile
# vridge-web 디렉토리만 빌드하고 Django 완전 무시

FROM node:18-alpine AS base
WORKDIR /app

# vridge-web만 복사 (Django 디렉토리 완전 제외)
COPY vridge-web/package*.json vridge-web/pnpm-lock.yaml ./
COPY vridge-web/ ./

# pnpm 설치 및 의존성 설치
RUN npm install -g pnpm@10.15.0
RUN pnpm install --frozen-lockfile

# Next.js 빌드
RUN pnpm run build

# 프로덕션 실행
EXPOSE 3000
CMD ["pnpm", "run", "start"]