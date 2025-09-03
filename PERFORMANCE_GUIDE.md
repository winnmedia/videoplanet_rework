# VLANET 성능 최적화 시스템 가이드

## 🚀 개요

VLANET 통합 파이프라인의 완전한 성능 최적화 및 모니터링 시스템이 구축되었습니다. 이 시스템은 Core Web Vitals 기준 (LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1)을 만족하며 7단계 파이프라인의 원활한 진행을 보장합니다.

## 📋 구현된 시스템

### 1. Core Web Vitals 최적화
- **LCP (Largest Contentful Paint)**: 2.5초 이내 달성
- **INP (Interaction to Next Paint)**: 200ms 이내 보장  
- **CLS (Cumulative Layout Shift)**: 0.1 이하 유지
- **실시간 모니터링**: Web Vitals API 기반 자동 측정

### 2. 번들 최적화
- **코드 스플리팅**: React, Redux, 벤더 청크 분리
- **Tree Shaking**: 미사용 코드 자동 제거
- **동적 임포트**: 필요 시점 로딩으로 초기 번들 크기 최소화

### 3. 리소스 최적화
- **OptimizedImage**: WebP/AVIF 포맷, 반응형 이미지, 레이지 로딩
- **OptimizedVideo**: 적응형 스트리밍, 품질 선택, 프로그레시브 로딩
- **폰트 최적화**: font-display: swap, 프리로드 지원

### 4. 캐싱 전략
- **Service Worker**: 다층 캐싱 (critical, static, api, media)
- **브라우저 캐시**: 정적 자산 장기 캐싱 (1년)
- **API 캐싱**: 네트워크 우선, 캐시 폴백 전략

### 5. Real User Monitoring (RUM)
- **실사용자 데이터**: 10% 샘플링으로 실제 성능 측정
- **세션 추적**: 사용자 세션별 성능 메트릭 수집
- **디바이스별 분석**: 모바일/태블릿/데스크톱 구분 측정

### 6. 성능 알림 시스템
- **임계값 모니터링**: 성능 기준 위반 시 즉시 알림
- **회귀 감지**: 성능 악화 20% 이상 시 자동 감지
- **다채널 알림**: 콘솔, 브라우저 알림, 웹훅 지원

## 🔧 사용 방법

### 기본 설정

성능 모니터링은 앱 시작 시 자동으로 초기화됩니다:

```tsx
// src/app/providers.tsx에서 자동 초기화됨
<PerformanceProvider>
  {children}
</PerformanceProvider>
```

### 성능 대시보드 사용

```tsx
import { PerformanceDashboard } from '@/widgets';

function AdminPage() {
  return (
    <div>
      <PerformanceDashboard 
        showRecommendations={true}
        onPerformanceIssue={(issue) => {
          // 성능 이슈 처리
          console.warn('Performance issue:', issue);
        }}
      />
    </div>
  );
}
```

### 최적화된 컴포넌트 사용

#### 이미지 최적화
```tsx
import { OptimizedImage } from '@/shared/ui';

<OptimizedImage
  src="/hero-image.jpg"
  alt="Hero Image"
  width={1200}
  height={600}
  priority="high"  // LCP 이미지에 사용
  aspectRatio={16/9}
  placeholder="blur"
/>
```

#### 비디오 최적화
```tsx
import { OptimizedVideo } from '@/shared/ui';

<OptimizedVideo
  src="/video.mp4"
  title="프로젝트 소개"
  poster="/video-poster.jpg"
  priority="normal"
  enableQualitySelector={true}
  qualities={[
    { label: 'HD', src: '/video-hd.mp4' },
    { label: 'SD', src: '/video-sd.mp4' }
  ]}
/>
```

#### 레이지 로딩
```tsx
import { LazyLoader } from '@/shared/ui';

<LazyLoader
  trackingName="project-list"
  placeholder={<ProjectListSkeleton />}
>
  <ProjectList />
</LazyLoader>
```

### 성능 훅 사용

```tsx
import usePerformance from '@/shared/lib/performance/usePerformance';

function MyComponent() {
  const { 
    performanceScore, 
    hasPerformanceIssues, 
    trackCustomMetric,
    getRecommendations 
  } = usePerformance();

  const handleAction = async () => {
    const startTime = performance.now();
    await someAsyncAction();
    const duration = performance.now() - startTime;
    
    trackCustomMetric('custom-action', duration);
  };

  return (
    <div>
      <div>성능 점수: {performanceScore}</div>
      {hasPerformanceIssues && (
        <div>성능 개선이 필요합니다</div>
      )}
    </div>
  );
}
```

## 📊 성능 모니터링

### Lighthouse CI
```bash
# 성능 예산 검증
pnpm run perf:lighthouse

# 전체 성능 테스트
pnpm run perf:test
```

### 번들 분석
```bash
# 번들 크기 분석
pnpm run perf:analyze

# 개발 환경에서 번들 분석기 활성화
ANALYZE=true pnpm run dev
```

### 실사용자 모니터링
- 프로덕션에서 자동으로 10% 샘플링
- 개발 환경에서 100% 모니터링
- API 엔드포인트: `/api/performance/rum`

## 🎯 성능 예산

### Core Web Vitals 목표
- **LCP**: ≤ 2.5초 (경고: 2.0초, 에러: 3.0초)
- **INP**: ≤ 200ms (경고: 150ms, 에러: 300ms)
- **CLS**: ≤ 0.1 (경고: 0.05, 에러: 0.25)
- **FCP**: ≤ 1.5초 (경고: 1.0초, 에러: 2.0초)

### 리소스 예산
- **메인 JS 번들**: ≤ 250KB (에러: 300KB)
- **벤더 JS 번들**: ≤ 500KB (에러: 600KB)
- **메인 CSS**: ≤ 50KB (에러: 75KB)
- **전체 페이지**: ≤ 2MB (에러: 3MB)

### 페이지별 특화 예산
- **랜딩 페이지**: LCP ≤ 2.0초, JS ≤ 200KB
- **프로젝트 페이지**: 이미지 ≤ 500KB 허용
- **캘린더**: CLS ≤ 0.05 (엄격한 레이아웃)
- **피드백**: INP ≤ 100ms (비디오 상호작용)

## ⚠️ 성능 알림

### 자동 알림 조건
1. **Critical**: Core Web Vitals 에러 임계값 초과
2. **Warning**: Core Web Vitals 경고 임계값 초과
3. **Regression**: 기준 대비 20% 이상 성능 악화

### 알림 채널
- **Console**: 개발 환경 기본 활성화
- **Browser Notification**: 프로덕션 환경
- **Webhook**: Slack/Discord 통합 (환경변수 설정 시)

## 🛠️ 문제 해결

### 일반적인 성능 이슈

#### LCP 개선
1. 중요 이미지에 `priority="high"` 설정
2. 이미지 포맷 최적화 (WebP/AVIF)
3. 서버 응답 시간 개선
4. 렌더 블로킹 리소스 제거

#### INP 개선
1. 긴 JavaScript 작업 분할
2. `React.startTransition` 사용
3. 코드 스플리팅 적용
4. Web Workers 활용

#### CLS 개선
1. 이미지/비디오에 width/height 지정
2. 폰트 로딩 최적화 (`font-display: swap`)
3. 동적 콘텐츠 공간 예약
4. Transform/opacity 애니메이션만 사용

### 디버깅 도구

#### 개발자 콘솔
```javascript
// 현재 성능 메트릭 확인
const monitor = window.__PERFORMANCE_MONITOR__;
monitor.getMetrics();

// 성능 권장사항 확인
monitor.getRecommendations();
```

#### 성능 추적
```javascript
// 커스텀 메트릭 추가
performance.mark('action-start');
// ... 작업 수행
performance.mark('action-end');
performance.measure('action-duration', 'action-start', 'action-end');
```

## 🔄 지속적 모니터링

### CI/CD 통합
- **Lighthouse CI**: 모든 PR에서 성능 예산 검증
- **Bundle Analysis**: 번들 크기 회귀 방지
- **Performance Tests**: 성능 회귀 자동 감지

### 성능 대시보드
- 실시간 Core Web Vitals 모니터링
- 성능 트렌드 분석
- 개선 권장사항 제공
- 알림 기록 관리

## 📈 성능 목표 달성 현황

✅ **LCP ≤ 2.5초**: Next.js 최적화, 이미지 최적화, 프리로드 전략
✅ **INP ≤ 200ms**: 코드 스플리팅, 메인 스레드 최적화
✅ **CLS ≤ 0.1**: 레이아웃 최적화, 폰트 로딩 개선
✅ **캐싱 전략**: Service Worker 다층 캐싱
✅ **RUM 시스템**: 실사용자 성능 데이터 수집
✅ **알림 시스템**: 성능 회귀 즉시 감지

---

**성능은 사용자 경험의 핵심입니다. 모든 변경사항은 성능 예산을 준수해야 하며, 회귀 발생 시 즉시 수정되어야 합니다.**