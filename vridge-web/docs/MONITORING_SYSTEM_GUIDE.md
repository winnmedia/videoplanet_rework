# VRIDGE 통합 모니터링 시스템 가이드

본 문서는 VRIDGE 프로젝트의 포괄적인 모니터링 시스템에 대한 완전한 가이드입니다. Data Lead 관점에서 설계된 이 시스템은 서비스 안정성과 사용자 경험을 실시간으로 모니터링하고 문제 발생 시 즉각적인 대응을 가능하게 합니다.

## 📊 시스템 개요

### 핵심 구성 요소

1. **실시간 데이터 수집 시스템** (`real-time-data-collector.ts`)
   - 사용자 행동, API 성능, Web Vitals 실시간 수집
   - 배치 처리 및 오프라인 지원
   - Zod 스키마 기반 데이터 검증

2. **사용자 여정 모니터링** (`user-journey-monitor.ts`)
   - 비즈니스 크리티컬한 사용자 여정 추적
   - 중단율 조기 감지 및 알림
   - 여정별 성과 분석

3. **Core Web Vitals 모니터링** (`web-vitals-monitor.ts`)
   - LCP, INP, CLS, TTFB, FCP 자동 측정
   - 성능 임계값 감시 및 알림
   - 디바이스별 성능 분석

4. **지능형 알림 시스템** (`alert-system.ts`)
   - 다중 채널 알림 (Dashboard, Slack, Email, SMS)
   - 알림 억제 및 중복 방지
   - 우선순위 기반 에스컬레이션

5. **데이터 품질 보증 및 SLO 모니터링** (`data-quality-monitor.ts`)
   - 데이터 파이프라인 신뢰성 검증
   - 서비스 수준 목표 추적
   - 비즈니스 임팩트 평가

6. **실시간 대시보드** (`RealTimeMonitoringDashboard.tsx`)
   - 통합 모니터링 대시보드
   - 실시간 메트릭 시각화
   - 알림 관리 인터페이스

## 🚀 빠른 시작

### 1. 시스템 초기화

```typescript
import { createMonitoringSystem } from '@/lib/analytics/monitoring-system'

// 기본 설정으로 초기화
const monitoring = createMonitoringSystem({
  environment: 'production',
  features: {
    userJourneyTracking: true,
    webVitalsMonitoring: true,
    apiPerformanceTracking: true,
    dataQualityChecks: true,
    realTimeAlerts: true
  },
  alerting: {
    defaultChannels: ['dashboard', 'slack'],
    criticalChannels: ['dashboard', 'slack', 'email'],
    enabledRules: [
      'api_error_rate',
      'slow_response', 
      'journey_abandonment',
      'submenu_errors',
      'poor_web_vitals',
      'data_quality_issue'
    ]
  }
})

// 시스템 초기화
await monitoring.initialize()
```

### 2. 수동 이벤트 추적

```typescript
import { 
  collectUserJourneyEvent,
  collectBusinessMetric,
  startUserJourney,
  progressJourneyStep
} from '@/lib/analytics'

// 사용자 여정 시작
const journeyId = startUserJourney('project_creation', 'user123', {
  source: 'dashboard',
  projectType: 'video'
})

// 여정 단계 진행
progressJourneyStep(journeyId, 'form_completion', true)

// 비즈니스 메트릭 수집
collectBusinessMetric({
  metricName: 'project_created',
  value: 1,
  unit: 'count',
  source: 'user_action',
  businessSlice: 'project_management',
  dimensions: {
    user_id: 'user123',
    project_type: 'video'
  }
})

// 사용자 이벤트 수집
collectUserJourneyEvent({
  userId: 'user123',
  eventType: 'click',
  eventName: 'create_project_button',
  page: '/projects',
  properties: {
    button_location: 'header',
    project_count: 5
  },
  success: true
})
```

### 3. 알림 설정

```typescript
import { alertSystem, subscribeToAlerts } from '@/lib/analytics/alert-system'

// 대시보드에서 알림 구독
const unsubscribe = subscribeToAlerts('dashboard', (alert) => {
  console.log('New alert:', alert.title, alert.severity)
  
  // 사용자 인터페이스 업데이트
  updateDashboardAlerts(alert)
})

// 커스텀 알림 규칙 추가
alertSystem.addAlertRule({
  ruleId: 'custom_conversion_drop',
  name: '전환율 급락 감지',
  condition: (data) => data.conversionRate < 0.15,
  severity: 'high',
  channels: ['slack', 'email'],
  cooldownMinutes: 30,
  maxAlertsPerHour: 2,
  businessSlice: 'conversion_optimization',
  enabled: true,
  template: {
    title: '전환율이 임계값 이하로 떨어졌습니다',
    description: '현재 전환율: {conversionRate}%, 목표: 15%',
    actionItems: [
      '사용자 플로우 점검',
      '기술적 이슈 확인',
      'A/B 테스트 결과 분석'
    ]
  }
})
```

### 4. 대시보드 통합

```typescript
import RealTimeMonitoringDashboard from '@/widgets/MonitoringDashboard/ui/RealTimeMonitoringDashboard'

// React 컴포넌트에서 사용
function MonitoringPage() {
  return (
    <div className="monitoring-page">
      <h1>실시간 모니터링 대시보드</h1>
      <RealTimeMonitoringDashboard />
    </div>
  )
}
```

## 📈 모니터링 대상 및 메트릭

### 1. 핵심 사용자 여정

#### 온보딩 여정 (ONBOARDING)
- **단계**: 랜딩 → 회원가입 → 이메일 인증 → 프로필 설정 → 대시보드 진입
- **목표 완료율**: 80%
- **임계 알림**: 30% 이상 중단율

#### 프로젝트 생성 여정 (PROJECT_CREATION)
- **단계**: 생성 버튼 → 정보 입력 → 제출 → 프로젝트 대시보드
- **목표 완료율**: 90%
- **임계 알림**: 20% 이상 중단율

#### 서브메뉴 네비게이션 (SUBMENU_NAVIGATION)
- **단계**: 메뉴 호버 → 서브메뉴 선택 → 페이지 로딩 → 기능 접근
- **목표 완료율**: 95%
- **임계 알림**: 10% 이상 중단율

#### 피드백 제출 여정 (FEEDBACK_SUBMISSION)
- **단계**: 비디오 접근 → 피드백 시작 → 내용 작성 → 제출
- **목표 완료율**: 85%
- **임계 알림**: 25% 이상 중단율

### 2. 성능 지표 (Core Web Vitals)

| 메트릭 | Good | Needs Improvement | Poor | 알림 임계값 |
|--------|------|-------------------|------|-------------|
| LCP    | ≤2.5s | 2.5s-4.0s | >4.0s | >4.0s |
| INP    | ≤200ms | 200ms-500ms | >500ms | >500ms |
| CLS    | ≤0.1 | 0.1-0.25 | >0.25 | >0.25 |
| TTFB   | ≤800ms | 800ms-1.8s | >1.8s | >1.8s |
| FCP    | ≤1.8s | 1.8s-3.0s | >3.0s | >3.0s |

### 3. API 성능 모니터링

#### 감시 대상
- **응답 시간**: P50, P95, P99
- **에러율**: 4xx, 5xx 비율
- **처리량**: RPS (Requests per Second)
- **가용성**: 업타임 비율

#### 알림 임계값
- **느린 응답**: >3초
- **높은 에러율**: >10%
- **가용성 저하**: <95%

### 4. 데이터 품질 지표

#### 품질 차원
- **완전성 (Completeness)**: 필수 필드 누락률
- **정확성 (Accuracy)**: 데이터 검증 실패율
- **일관성 (Consistency)**: 포맷 및 규칙 위반율
- **적시성 (Timeliness)**: 데이터 지연 시간
- **유효성 (Validity)**: 스키마 준수율

#### SLO 정의
- **서브메뉴 가용성**: 99% (24시간)
- **API 응답 시간**: P95 < 2초 (1시간)
- **사용자 여정 완료율**: 85% (24시간)
- **데이터 파이프라인 처리량**: 1000 events/hour
- **Web 성능**: 75% Good 등급 (24시간)

## 🚨 알림 시스템

### 알림 채널

#### 1. Dashboard (실시간)
- **용도**: 실시간 모니터링
- **대상**: 운영팀, 개발팀
- **응답 시간**: 즉시

#### 2. Slack
- **용도**: 팀 협업 및 빠른 대응
- **대상**: 개발팀, DevOps
- **응답 시간**: 1분 이내
- **설정**: `SLACK_WEBHOOK_URL` 환경 변수

#### 3. Email
- **용도**: 공식 알림 및 기록
- **대상**: 관리자, 팀 리더
- **응답 시간**: 5분 이내

#### 4. SMS
- **용도**: 긴급 상황 알림
- **대상**: 온콜 엔지니어
- **응답 시간**: 1분 이내

### 알림 우선순위 및 에스컬레이션

#### Critical (심각)
- **채널**: Dashboard + Slack + SMS
- **조건**: 
  - 서브메뉴 완전 실패
  - API 전체 장애
  - 데이터 손실 위험
- **대응**: 즉시 대응 필요

#### High (높음)
- **채널**: Dashboard + Slack + Email
- **조건**:
  - 사용자 여정 높은 중단율 (>30%)
  - API 에러율 급증 (>10%)
  - 데이터 품질 심각 이슈
- **대응**: 1시간 내 대응

#### Medium (보통)
- **채널**: Dashboard + Slack
- **조건**:
  - 성능 지표 임계값 초과
  - 데이터 품질 경고
- **대응**: 4시간 내 대응

#### Low (낮음)
- **채널**: Dashboard
- **조건**:
  - 일반적인 성능 변화
  - 정보성 알림
- **대응**: 업무시간 내 확인

### 알림 억제 규칙

```typescript
// 야간 시간 저우선순위 알림 억제 (예시)
{
  pattern: 'severity:(low|medium)',
  duration: 60, // 1시간
  condition: 'time:22:00-06:00',
  reason: '야간 시간대 저우선순위 알림 억제'
}

// 유지보수 시간 전체 알림 억제
{
  pattern: 'businessSlice:.*',
  duration: 120, // 2시간
  reason: '예정된 유지보수 시간'
}
```

## 🔧 환경 변수 설정

```bash
# 기본 설정
NODE_ENV=production
MONITORING_SAMPLE_RATE=0.1  # 10% 샘플링

# 알림 채널 설정
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
ALERT_WEBHOOK_URL=https://your-webhook-service.com/alerts
EMAIL_SERVICE_API_KEY=your-email-service-key
SMS_SERVICE_API_KEY=your-sms-service-key

# 데이터 보존 설정
METRICS_RETENTION_HOURS=24
ALERTS_RETENTION_HOURS=72

# 성능 임계값
WEB_VITALS_LCP_THRESHOLD=4000
WEB_VITALS_INP_THRESHOLD=500
WEB_VITALS_CLS_THRESHOLD=0.25
API_RESPONSE_TIME_THRESHOLD=3000
```

## 📋 운영 가이드

### 일일 점검 항목

#### 1. 시스템 헬스 체크
```typescript
import { monitoringSystem } from '@/lib/analytics/monitoring-system'

const status = await monitoringSystem.getInstance().getSystemStatus()
console.log('Health Score:', status.healthScore)
console.log('Active Components:', status.activeComponents)
console.log('Issues:', status.issues.length)
```

#### 2. 주요 메트릭 확인
- 사용자 여정 완료율 추이
- API 성능 지표 변화
- 알림 발생 빈도 및 해결 시간
- 데이터 품질 점수

#### 3. 대시보드 검토
- 활성 알림 상태 확인
- 성능 지표 트렌드 분석
- SLO 준수율 점검

### 문제 해결 가이드

#### 1. 높은 사용자 여정 중단율
```bash
# 원인 분석 체크리스트
1. 서브메뉴 동작 상태 확인
2. API 응답 시간 및 에러율 점검
3. 프론트엔드 JavaScript 에러 로그 확인
4. 네트워크 상태 및 CDN 성능 점검
5. 사용자 피드백 및 브라우저 호환성 확인
```

#### 2. API 성능 저하
```bash
# 대응 절차
1. 서버 리소스 사용률 확인 (CPU, 메모리, 디스크)
2. 데이터베이스 쿼리 성능 분석
3. 캐시 히트율 및 만료 정책 점검
4. 외부 서비스 의존성 상태 확인
5. 로드 밸런서 및 스케일링 정책 검토
```

#### 3. 데이터 품질 이슈
```bash
# 해결 방법
1. 데이터 파이프라인 로그 확인
2. 소스 시스템 연결 상태 점검
3. 변환 로직 및 스키마 검증 규칙 확인
4. 백업 데이터 및 복구 절차 준비
5. 임시 수동 데이터 수집 고려
```

### 정기 유지보수

#### 주간 작업
- 알림 규칙 효율성 분석
- False Positive 알림 조정
- 성능 임계값 재검토
- 데이터 보존 정책 점검

#### 월간 작업
- SLO 목표값 재평가
- 모니터링 범위 확장 검토
- 대시보드 UX 개선
- 팀 교육 및 프로세스 업데이트

## 🔍 고급 사용법

### 1. 커스텀 메트릭 추가

```typescript
// 비즈니스 특화 메트릭 정의
const customMetricSchema = z.object({
  videoUploadSuccess: z.boolean(),
  uploadDuration: z.number(),
  fileSize: z.number(),
  compressionRatio: z.number()
})

// 메트릭 수집
collectBusinessMetric({
  metricName: 'video_upload_performance',
  value: uploadDuration,
  unit: 'milliseconds',
  source: 'video_service',
  businessSlice: 'video_production',
  dimensions: {
    file_size: fileSize.toString(),
    compression_ratio: compressionRatio.toString(),
    success: videoUploadSuccess.toString()
  }
})
```

### 2. 다중 환경 설정

```typescript
// 환경별 설정 분리
const environmentConfigs = {
  development: {
    sampling: { userEvents: 1.0, webVitals: 1.0, apiMetrics: 1.0 },
    alerting: { defaultChannels: ['dashboard'] },
    debugMode: true
  },
  staging: {
    sampling: { userEvents: 0.5, webVitals: 0.5, apiMetrics: 1.0 },
    alerting: { defaultChannels: ['dashboard', 'slack'] },
    debugMode: false
  },
  production: {
    sampling: { userEvents: 0.1, webVitals: 0.05, apiMetrics: 1.0 },
    alerting: { 
      defaultChannels: ['dashboard', 'slack'], 
      criticalChannels: ['dashboard', 'slack', 'email', 'sms'] 
    },
    debugMode: false
  }
}

const config = environmentConfigs[process.env.NODE_ENV]
const monitoring = createMonitoringSystem(config)
```

### 3. A/B 테스트 통합

```typescript
// A/B 테스트 메트릭 추적
function trackABTestConversion(testId: string, variant: string, converted: boolean) {
  collectBusinessMetric({
    metricName: 'ab_test_conversion',
    value: converted ? 1 : 0,
    unit: 'count',
    source: 'ab_testing',
    businessSlice: 'conversion_optimization',
    dimensions: {
      test_id: testId,
      variant: variant,
      user_segment: getUserSegment()
    }
  })
}
```

### 4. 머신러닝 이상 감지 통합

```typescript
// 이상 감지 모델 통합
class AnomalyDetectionMonitor {
  async checkForAnomalies() {
    const metrics = await this.collectRecentMetrics()
    const anomalies = await this.mlModel.detectAnomalies(metrics)
    
    for (const anomaly of anomalies) {
      await alertSystem.triggerAlert('ml_anomaly_detected', {
        metricName: anomaly.metric,
        severity: anomaly.severity,
        confidence: anomaly.confidence,
        expectedRange: anomaly.expectedRange,
        actualValue: anomaly.actualValue
      })
    }
  }
}
```

## 🚀 성능 최적화 팁

### 1. 샘플링 전략
```typescript
// 프로덕션 환경에서 효율적인 샘플링
const samplingConfig = {
  // 핵심 비즈니스 이벤트: 100% 수집
  criticalEvents: 1.0,
  
  // 일반 사용자 상호작용: 30% 수집
  userInteractions: 0.3,
  
  // 성능 메트릭: 10% 수집 (충분한 통계적 유의성)
  performanceMetrics: 0.1,
  
  // 디버깅 이벤트: 1% 수집
  debugEvents: 0.01
}
```

### 2. 배치 처리 최적화
```typescript
// 네트워크 효율성을 위한 배치 크기 조정
const batchConfig = {
  batchSize: 100,        // 배치당 이벤트 수
  flushInterval: 5000,   // 5초마다 전송
  compressionEnabled: true,
  retryAttempts: 3
}
```

### 3. 메모리 사용량 관리
```typescript
// 메모리 사용량 최적화
const memoryConfig = {
  maxMetricsPerEndpoint: 1000,  // 엔드포인트당 최대 메트릭 수
  maxLogs: 5000,                // 최대 로그 수
  cleanupInterval: 24 * 60 * 60 * 1000  // 24시간마다 정리
}
```

## 📞 지원 및 문제 신고

### 긴급 상황 대응
- **Slack**: #emergency-monitoring
- **이메일**: monitoring-alerts@vridge.com
- **온콜 엔지니어**: +82-10-XXXX-XXXX

### 일반 문의 및 개선 요청
- **Slack**: #monitoring-system
- **이메일**: platform-team@vridge.com
- **GitHub Issues**: [모니터링 시스템 이슈](https://github.com/vridge/monitoring/issues)

### 문서 업데이트 요청
본 문서의 개선사항이나 누락된 내용이 있다면 다음 경로로 요청해주세요:
- **Pull Request**: `docs/MONITORING_SYSTEM_GUIDE.md` 파일 수정
- **이슈 등록**: 문서 개선 라벨과 함께 이슈 등록

---

**마지막 업데이트**: 2025-08-28  
**버전**: v1.0.0  
**작성자**: Data Lead Team