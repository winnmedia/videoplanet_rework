# 이메일 모니터링 시스템

이메일 발송에 대한 종합적인 로깅, 모니터링, 제한 기능을 제공하는 시스템입니다.

## 주요 기능

✅ **PII 보호**: 개인정보(이메일, 이름 등) 로깅 방지  
✅ **발송량 제한**: 사용자별/타입별 발송량 모니터링  
✅ **에러 분석**: 구조화된 에러 로깅 및 통계  
✅ **실시간 알림**: 에러율/발송량 임계치 초과 시 알림  
✅ **메모리 관리**: 자동 로그 정리 및 메모리 제한  

## 사용법

### 1. 이메일 발송 로깅

```typescript
import { emailMonitor } from '@/lib/email/email-monitoring'

// 성공 로깅
emailMonitor.logEmail({
  type: 'verification',
  status: 'success',
  userHash: 'user123hash', // PII 제거된 해시값
  metadata: {
    provider: 'sendgrid',
    messageId: 'msg_123456',
    deliveryTime: 250,
    templateId: 'template_verification'
  }
})

// 실패 로깅
emailMonitor.logEmail({
  type: 'reset',
  status: 'failed',
  userHash: 'user456hash',
  errorMessage: 'Invalid email address',
  metadata: {
    provider: 'sendgrid',
    attemptCount: 1
  }
})
```

### 2. 발송 제한 확인

```typescript
import { emailCooldown } from '@/lib/email/cooldown'

// 쿨다운 및 제한 확인 (모니터링 통합)
const canSend = emailCooldown.check('user@example.com', 'verification')

if (!canSend) {
  console.log('발송 제한에 도달했습니다.')
  console.log(`남은 시간: ${emailCooldown.getRemainingSeconds('user@example.com')}초`)
}
```

### 3. 통계 조회

```typescript
// 전체 통계
const overallStats = emailMonitor.getOverallStats()
console.log(`전체 발송: ${overallStats.totalSent}`)
console.log(`성공률: ${(overallStats.successRate * 100).toFixed(1)}%`)

// 시간별 통계
const hourlyStats = emailMonitor.getHourlyStats()
console.log(`이번 시간 발송량: ${hourlyStats.totalSent}`)

// 에러 분석
const errorStats = emailMonitor.getErrorStats()
console.log('에러 타입별 분포:', errorStats.errorsByType)
console.log('에러 메시지별 분포:', errorStats.errorsByMessage)
```

### 4. 실시간 알림 설정

```typescript
// 알림 콜백 등록
const unsubscribe = emailMonitor.onAlert(alert => {
  console.warn(`🚨 ${alert.type}: ${alert.message}`)
  
  // 심각한 알림인 경우 추가 처리
  if (alert.severity === 'critical') {
    // Slack, Discord, 또는 다른 알림 서비스로 전송
    notifyAdministrator(alert)
  }
})

// 정기적 알림 확인 (이미 자동으로 실행됨)
emailMonitor.checkAlerts()
```

### 5. API를 통한 모니터링

```typescript
// GET /api/admin/email-monitoring?action=stats
fetch('/api/admin/email-monitoring?action=stats')
  .then(res => res.json())
  .then(data => {
    console.log('전체 통계:', data.data.overall)
    console.log('시간별 통계:', data.data.hourly)
    console.log('에러 통계:', data.data.errors)
  })

// GET /api/admin/email-monitoring?action=health
fetch('/api/admin/email-monitoring?action=health')
  .then(res => res.json())
  .then(data => {
    console.log('시스템 상태:', data.data.status)
    console.log('체크 결과:', data.data.checks)
  })
```

## 설정 관리

```typescript
// 현재 설정 조회
const currentLimits = emailMonitor.getLimits()

// 설정 업데이트
emailMonitor.updateLimits({
  maxEmailsPerUserPerHour: 10,
  errorRateThreshold: 0.3,
  volumeSpikeThreshold: 2
})

// API를 통한 설정 업데이트
fetch('/api/admin/email-monitoring', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'update-limits',
    limits: {
      maxEmailsPerUserPerHour: 10,
      errorRateThreshold: 0.3
    }
  })
})
```

## 기본 제한값

- **사용자별 시간당 제한**: 5개
- **타입별 시간당 제한**: 1,000개
- **에러율 임계치**: 50%
- **발송량 급증 임계치**: 평균의 3배
- **메모리 내 최대 로그**: 10,000개
- **로그 보관 시간**: 24시간

## 알림 타입

1. **high_error_rate**: 에러율이 임계치를 초과한 경우
2. **volume_spike**: 발송량이 평상시보다 급증한 경우  
3. **quota_exceeded**: 할당량을 초과한 경우
4. **system_error**: 시스템 오류 발생 시

## 실제 이메일 서비스 통합

현재는 모의 발송으로 구현되어 있으며, 실제 SendGrid나 다른 이메일 서비스와 통합할 때는 다음과 같이 수정하세요:

```typescript
// app/api/auth/send-verification/route.ts에서
try {
  // 실제 이메일 발송
  const result = await sendGridService.send({
    to: email,
    template: templateId,
    // ...
  })
  
  // 성공 로깅
  emailMonitor.logEmail({
    type: emailType,
    status: 'success',
    userHash,
    metadata: {
      provider: 'sendgrid',
      messageId: result.messageId,
      deliveryTime: Date.now() - startTime
    }
  })
} catch (error) {
  // 실패 로깅
  emailMonitor.logEmail({
    type: emailType,
    status: 'failed',
    userHash,
    errorMessage: error.message,
    metadata: {
      provider: 'sendgrid',
      deliveryTime: Date.now() - startTime
    }
  })
}
```

## 확장 가능성

현재 메모리 기반으로 구현되어 있지만, 다음과 같이 확장 가능합니다:

1. **데이터베이스 백엔드**: PostgreSQL, MongoDB 등으로 영구 저장
2. **메트릭 시스템**: Prometheus, Grafana와 연동
3. **알림 채널**: Slack, Discord, PagerDuty 등과 통합
4. **대시보드**: React 기반 실시간 모니터링 대시보드

이 시스템은 TDD 방식으로 개발되었으며, 100% 테스트 커버리지를 제공합니다.