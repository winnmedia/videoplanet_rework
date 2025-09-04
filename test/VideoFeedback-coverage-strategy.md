# VideoFeedback 위젯 테스트 커버리지 100% 달성 전략

## 🎯 현재 상황 (58.3% → 100%)

### 성공 요인 분석
- ✅ **타임아웃 문제 해결**: 10초 → 128ms (99% 성능 향상)
- ✅ **TDD Red → Green 전환**: 모든 핵심 테스트 통과
- ✅ **최소 구현 완성**: 복잡성 제거, 테스트 가능성 확보

### 커버리지 갭 분석 (41.7% 미커버)

#### 1. 미테스트 영역 (예상)
```typescript
// 1. 에러 처리 로직 (10%)
try {
  const response = await getSession(sessionId)
} catch (err) {
  setError('네트워크 오류') // 미테스트
  onError?.(err.message)    // 미테스트
}

// 2. 조건부 렌더링 (8%)
{deadlineCountdown && (  // 미테스트 브랜치
  <span data-testid="deadline-countdown">
    마감까지 {deadlineCountdown}
  </span>
)}

// 3. 이벤트 핸들러 (15%)
const handleVideoClick = useCallback((coordinates) => {
  // 미테스트 함수
}, [])

// 4. 유틸리티 함수 (8.7%)
const getTimeUntilDeadline = () => {
  // 날짜 계산 로직 미테스트
}
```

## 📋 100% 커버리지 달성 로드맵

### Phase 1: 에러 시나리오 테스트 (10% 증가)

```typescript
describe('에러 처리 커버리지', () => {
  it('API 에러 시 에러 메시지 표시', async () => {
    const mockGetSession = vi.fn().mockRejectedValue(new Error('Network error'))
    // 에러 케이스 테스트
  })
  
  it('세션 없음 상태 처리', async () => {
    const mockGetSession = vi.fn().mockResolvedValue({ success: false })
    // null/undefined 상태 테스트
  })
  
  it('onError 콜백 호출 확인', async () => {
    const mockOnError = vi.fn()
    // 콜백 호출 테스트
  })
})
```

### Phase 2: 조건부 렌더링 테스트 (8% 증가)

```typescript
describe('조건부 렌더링 커버리지', () => {
  it('마감일이 있을 때 카운트다운 표시', async () => {
    // deadline이 있는 세션 데이터로 테스트
  })
  
  it('마감일이 없을 때 카운트다운 숨김', async () => {
    // deadline이 null인 세션 데이터로 테스트
  })
  
  it('showStats=false일 때 상태바 숨김', async () => {
    render(<VideoFeedbackWidget sessionId="test" showStats={false} />)
  })
  
  it('showTimeline=false일 때 타임라인 숨김', async () => {
    render(<VideoFeedbackWidget sessionId="test" showTimeline={false} />)
  })
})
```

### Phase 3: 이벤트 핸들러 테스트 (15% 증가)

```typescript
describe('이벤트 핸들러 커버리지', () => {
  it('재시도 버튼 클릭', async () => {
    // 에러 상태에서 재시도 버튼 클릭 테스트
  })
  
  it('상태 변경 셀렉트', async () => {
    const user = userEvent.setup()
    // select 옵션 변경 테스트
  })
  
  it('댓글 입력 및 제출', async () => {
    // textarea와 button 상호작용 테스트
  })
})
```

### Phase 4: 유틸리티 함수 테스트 (8.7% 증가)

```typescript
describe('유틸리티 함수 커버리지', () => {
  it('마감일 계산 - 일/시간 표시', () => {
    // 다양한 날짜 차이 시나리오
  })
  
  it('마감일 계산 - 마감 지남', () => {
    // 과거 날짜 시나리오
  })
  
  it('시간 포맷팅 - 분/초 변환', () => {
    // formatTimestamp 함수 테스트
  })
  
  it('상태 라벨 변환', () => {
    // getStatusLabel 함수 테스트
  })
})
```

## 🚀 즉시 실행 가능한 테스트 추가

### 1. 에러 처리 테스트
```typescript
it('API 실패 시 에러 상태 렌더링', async () => {
  // getSession을 실패하도록 모킹
  const failingGetSession = async () => {
    throw new Error('Network failed')
  }
  
  render(<VideoFeedbackWidget sessionId="error-test" />)
  
  await waitFor(() => {
    expect(screen.getByTestId('video-feedback-error')).toBeInTheDocument()
    expect(screen.getByText(/네트워크 오류가 발생했습니다/)).toBeInTheDocument()
  })
})
```

### 2. Props 변경 테스트
```typescript
it('모든 props 조합 테스트', async () => {
  const { rerender } = render(
    <VideoFeedbackWidget 
      sessionId="test" 
      isReadOnly={true}
      showTimeline={false}
      showMarkers={false}
      showStats={false}
    />
  )
  
  // 각 prop별 렌더링 차이 검증
})
```

### 3. 반응형 레이아웃 테스트
```typescript
it('모바일 뷰포트에서 클래스 변경', async () => {
  Object.defineProperty(window, 'innerWidth', { value: 375 })
  window.dispatchEvent(new Event('resize'))
  
  render(<VideoFeedbackWidget sessionId="test" />)
  
  await waitFor(() => {
    const widget = screen.getByTestId('video-feedback-widget')
    expect(widget.className).toMatch(/mobile|stack/i)
  })
})
```

## 📊 예상 커버리지 달성률

| Phase | 테스트 영역 | 예상 증가 | 누적 커버리지 |
|-------|-------------|-----------|---------------|
| 현재  | 기본 렌더링 | - | 58.3% |
| 1     | 에러 처리   | +10% | 68.3% |
| 2     | 조건부 렌더링| +8% | 76.3% |
| 3     | 이벤트 핸들러| +15% | 91.3% |
| 4     | 유틸리티    | +8.7% | 100% |

## 🎯 우선순위 권장사항

1. **즉시 실행** (1시간): 에러 처리 테스트 추가 → 68.3%
2. **같은 날** (2시간): 조건부 렌더링 테스트 → 76.3%
3. **주중 완료** (4시간): 이벤트 핸들러 테스트 → 91.3%
4. **이번 주** (2시간): 유틸리티 함수 테스트 → 100%

## 🔧 자동화 도구 활용

```bash
# 커버리지 리포트 생성
npx vitest --coverage widgets/VideoFeedback/

# 특정 임계값 설정
npx vitest --coverage.thresholds.lines=95

# 커버리지 미달 파일만 표시
npx vitest --coverage --coverage.reporter=text-summary
```

**최종 목표**: VideoFeedback 모듈 **100% 커버리지** 달성으로 품질 보증 완성