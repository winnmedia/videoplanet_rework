#!/bin/sh

# 🏥 Docker 컨테이너 헬스체크 스크립트
# VRidge 애플리케이션의 상태를 체크합니다

set -e

# 설정
HOST="${HOSTNAME:-localhost}"
PORT="${PORT:-3000}"
TIMEOUT="${HEALTHCHECK_TIMEOUT:-3}"

# 색상 정의 (로그용)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 로그 함수
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [HEALTHCHECK] $1"
}

log_success() {
    echo "${GREEN}$(date '+%Y-%m-%d %H:%M:%S') [HEALTHCHECK] ✅ $1${NC}"
}

log_warning() {
    echo "${YELLOW}$(date '+%Y-%m-%d %H:%M:%S') [HEALTHCHECK] ⚠️  $1${NC}"
}

log_error() {
    echo "${RED}$(date '+%Y-%m-%d %H:%M:%S') [HEALTHCHECK] ❌ $1${NC}"
}

# 기본 HTTP 헬스체크
check_http_health() {
    log "Checking HTTP health endpoint..."
    
    # /api/health 엔드포인트 체크 (우선)
    if wget --quiet --tries=1 --timeout=$TIMEOUT --spider "http://$HOST:$PORT/api/health" 2>/dev/null; then
        log_success "API health endpoint responding"
        return 0
    fi
    
    # 메인 페이지 체크 (대안)
    if wget --quiet --tries=1 --timeout=$TIMEOUT --spider "http://$HOST:$PORT/" 2>/dev/null; then
        log_warning "Main page responding but API health endpoint failed"
        return 0
    fi
    
    log_error "HTTP endpoints not responding"
    return 1
}

# Next.js 서버 프로세스 체크
check_process() {
    log "Checking Next.js server process..."
    
    # node server.js 프로세스 확인
    if pgrep -f "node server.js" > /dev/null; then
        log_success "Next.js server process is running"
        return 0
    fi
    
    log_error "Next.js server process not found"
    return 1
}

# 메모리 사용량 체크 (선택적)
check_memory() {
    log "Checking memory usage..."
    
    # 메모리 사용량 확인 (80% 이상이면 경고)
    MEMORY_USAGE=$(free | awk '/^Mem:/{printf("%.2f", $3/$2 * 100.0)}' 2>/dev/null || echo "0")
    
    if [ ! -z "$MEMORY_USAGE" ] && [ $(echo "$MEMORY_USAGE > 80" | bc -l 2>/dev/null || echo 0) -eq 1 ]; then
        log_warning "High memory usage: ${MEMORY_USAGE}%"
    else
        log "Memory usage: ${MEMORY_USAGE}%"
    fi
}

# 디스크 공간 체크 (선택적)
check_disk() {
    log "Checking disk space..."
    
    # 루트 파티션 사용량 확인 (90% 이상이면 경고)
    DISK_USAGE=$(df / | awk 'NR==2{print $5}' | sed 's/%//' 2>/dev/null || echo "0")
    
    if [ ! -z "$DISK_USAGE" ] && [ "$DISK_USAGE" -gt 90 ]; then
        log_warning "High disk usage: ${DISK_USAGE}%"
    else
        log "Disk usage: ${DISK_USAGE}%"
    fi
}

# 빌드 정보 체크 (선택적)
check_build_info() {
    if [ -f "/app/build-info.json" ]; then
        VERSION=$(cat /app/build-info.json | grep '"version"' | cut -d'"' -f4 2>/dev/null || echo "unknown")
        ENVIRONMENT=$(cat /app/build-info.json | grep '"environment"' | cut -d'"' -f4 2>/dev/null || echo "unknown")
        log "Build info - Version: $VERSION, Environment: $ENVIRONMENT"
    fi
}

# 메인 헬스체크 실행
main() {
    log "Starting health check..."
    
    # 빌드 정보 표시
    check_build_info
    
    # 필수 체크: 프로세스 + HTTP
    if ! check_process; then
        log_error "Process check failed"
        exit 1
    fi
    
    if ! check_http_health; then
        log_error "HTTP health check failed"
        exit 1
    fi
    
    # 선택적 체크 (실패해도 전체 헬스체크는 통과)
    check_memory
    check_disk
    
    log_success "All health checks passed"
    exit 0
}

# 스크립트 실행
main "$@"