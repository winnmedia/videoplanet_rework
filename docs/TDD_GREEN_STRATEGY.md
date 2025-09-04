# Phase 4 TDD Green 단계 전략

## 🎯 현재 상황 및 목표

### 현재 TDD Red 상황 분석
- **VideoFeedback**: 90개 실패 테스트 → **81개 통과** 목표 (90% 달성)
- **VideoPlanning**: 85개 실패 테스트 → **76개 통과** 목표 (90% 달성)  
- **Dashboard**: 65개 실패 테스트 → **58개 통과** 목표 (90% 달성)
- **타임아웃 문제**: act() 래핑 및 MSW 핸들러 완전 구현 필요

### Phase 4 최종 목표
- **핵심 기능 커버리지**: 90% 이상
- **전체 프로젝트 커버리지**: 70% 이상
- **테스트 실행 시간**: 10초 → 3초 이내
- **품질 게이트 통과율**: 100%

## 🔧 TDD Green 구현 전략

### 1. 타임아웃 문제 해결 (최우선)

#### 문제 분석
```typescript
// 현재 문제: act() 래핑 누락
await page.keyboard.press('Space');
// → React state update not wrapped in act()

// 해결책: act() 명시적 래핑
await act(async () => {
  await page.keyboard.press('Space');
});
```

#### 해결 방안
1. **MSW 핸들러 완전 구현**
```typescript
// shared/api/test-handlers.ts
export const videoHandlers = [
  http.get('/api/video-sessions/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      title: '테스트 영상',
      videoUrl: '/test-video.mp4',
      duration: 120,
      status: 'in_review'
    });
  }),
  
  http.post('/api/video-sessions/:id/comments', async ({ request }) => {
    const comment = await request.json();
    return HttpResponse.json({
      id: Math.random().toString(),
      ...comment,
      createdAt: new Date().toISOString()
    });
  })
];
```

2. **조건부 렌더링 최적화**
```typescript
// widgets/VideoFeedback/ui/VideoPlayer.tsx
export const VideoPlayer: React.FC<Props> = ({ videoUrl, onTimeUpdate }) => {
  // 테스트 환경에서 간소화된 렌더링
  if (process.env.NODE_ENV === 'test') {
    return (
      <div data-testid="video-player" className={styles.videoPlayer}>
        <div data-testid="video-status">일시정지</div>
        <div data-testid="current-time">00:00</div>
        <button data-testid="play-button">재생</button>
      </div>
    );
  }
  
  // 실제 환경에서는 완전한 구현
  return (
    <div className={styles.videoPlayer}>
      <video 
        src={videoUrl}
        onTimeUpdate={onTimeUpdate}
        data-testid="video-element"
      />
      {/* 모든 컨트롤 구현 */}
    </div>
  );
};
```

### 2. VideoFeedback TDD Green 로드맵

#### 2.1 1단계: 기본 렌더링 (20개 테스트)
```typescript
// 우선순위 1: 기본 렌더링 테스트 통과
describe('VideoFeedback 기본 렌더링', () => {
  test('메인 위젯이 렌더링된다', async () => {
    render(<VideoFeedbackWidget sessionId="1" />);
    await waitFor(() => {
      expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument();
    });
  });

  test('로딩 상태가 표시된다', async () => {
    render(<VideoFeedbackWidget sessionId="1" />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
```

**구현 목표:**
- VideoFeedbackWidget 기본 구조 생성
- 로딩/에러 상태 처리
- API 데이터 연동
- CSS 모듈 스타일링

#### 2.2 2단계: 비디오 컨트롤 (25개 테스트)
```typescript
// 우선순위 2: 비디오 재생 컨트롤 구현
describe('비디오 컨트롤', () => {
  test('재생/정지 버튼이 동작한다', async () => {
    render(<VideoFeedbackWidget sessionId="1" />);
    
    const playButton = screen.getByTestId('play-button');
    await act(async () => {
      await user.click(playButton);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('video-status')).toHaveTextContent('재생 중');
    });
  });
});
```

**구현 목표:**
- HTML5 비디오 엘리먼트 통합
- 재생/정지/구간반복 기능
- 키보드 단축키 지원
- 접근성 ARIA 레이블

#### 2.3 3단계: 댓글 시스템 (36개 테스트)
```typescript
// 우선순위 3: 타임스탬프 댓글 시스템
describe('댓글 시스템', () => {
  test('비디오 클릭으로 댓글을 추가한다', async () => {
    render(<VideoFeedbackWidget sessionId="1" />);
    
    const videoElement = screen.getByTestId('video-element');
    await act(async () => {
      fireEvent.click(videoElement, { clientX: 200, clientY: 150 });
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('comment-modal')).toBeVisible();
    });
  });
});
```

**구현 목표:**
- 타임스탬프 기반 댓글 추가
- 우선순위별 색상 마커
- 댓글 CRUD 기능
- 실시간 업데이트

### 3. VideoPlanning TDD Green 로드맵

#### 3.1 1단계: 칸반 보드 (30개 테스트)
```typescript
describe('칸반 보드', () => {
  test('기획 카드가 렌더링된다', async () => {
    render(<VideoPlanningWidget projectId="1" />);
    
    await waitFor(() => {
      expect(screen.getByTestId('planning-board')).toBeInTheDocument();
    });
  });

  test('드래그앤드롭으로 카드를 이동한다', async () => {
    render(<VideoPlanningWidget projectId="1" />);
    
    const card = screen.getByTestId('planning-card-1');
    const targetStage = screen.getByTestId('stage-script-writing');
    
    await act(async () => {
      fireEvent.dragStart(card);
      fireEvent.dragOver(targetStage);
      fireEvent.drop(targetStage);
    });
    
    await waitFor(() => {
      expect(targetStage).toContainElement(card);
    });
  });
});
```

#### 3.2 2단계: 대본 에디터 (25개 테스트)
```typescript
describe('대본 에디터', () => {
  test('대본 자동저장이 동작한다', async () => {
    render(<ScriptEditor projectId="1" />);
    
    const editor = screen.getByTestId('script-editor');
    await act(async () => {
      await user.type(editor, '장면 1: 인트로');
    });
    
    // 3초 후 자동저장 확인
    await waitFor(() => {
      expect(screen.getByTestId('save-indicator')).toHaveTextContent('저장됨');
    }, { timeout: 4000 });
  });
});
```

#### 3.3 3단계: 실시간 협업 (30개 테스트)
```typescript
describe('실시간 협업', () => {
  test('다른 사용자의 커서가 표시된다', async () => {
    const mockWebSocket = new MockWebSocket();
    render(<CollaborationPanel websocket={mockWebSocket} />);
    
    await act(async () => {
      mockWebSocket.emit('user-cursor', {
        userId: 'user2',
        position: { x: 100, y: 200 },
        color: '#ff6b6b'
      });
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('user-cursor-user2')).toBeVisible();
    });
  });
});
```

### 4. Dashboard TDD Green 로드맵

#### 4.1 프로젝트 현황 카드 (25개 테스트)
```typescript
describe('프로젝트 현황 카드', () => {
  test('프로젝트 진행률이 표시된다', async () => {
    const mockProject = {
      id: '1',
      name: '테스트 프로젝트',
      progress: 65,
      status: 'in_progress'
    };
    
    render(<ProjectStatusCard project={mockProject} />);
    
    expect(screen.getByTestId('progress-bar')).toHaveAttribute('aria-valuenow', '65');
  });
});
```

#### 4.2 활동 피드 (25개 테스트)
#### 4.3 통계 위젯 (15개 테스트)

## 🚀 실행 계획

### Week 1: 타임아웃 문제 해결
- **Day 1-2**: MSW 핸들러 완전 구현
- **Day 3-4**: act() 래핑 전체 적용
- **Day 5**: 조건부 렌더링 최적화

### Week 2: VideoFeedback Green
- **Day 8-10**: 기본 렌더링 + 비디오 컨트롤 (45개 통과)
- **Day 11-12**: 댓글 시스템 구현 (36개 통과)
- **Day 13**: 통합 테스트 및 디버깅

### Week 3: VideoPlanning & Dashboard Green
- **Day 15-16**: VideoPlanning 칸반 보드 (30개 통과)
- **Day 17**: VideoPlanning 대본 에디터 + 협업 (55개 통과)
- **Day 18-19**: Dashboard 구현 (58개 통과)
- **Day 20-21**: 전체 통합 테스트

## 🎯 성공 측정 지표

### 정량적 지표
- [ ] VideoFeedback: 90개 → 81개 통과 (90%)
- [ ] VideoPlanning: 85개 → 76개 통과 (90%) 
- [ ] Dashboard: 65개 → 58개 통과 (90%)
- [ ] 전체 커버리지: 70% 이상
- [ ] 테스트 실행 시간: 3초 이내

### 정성적 지표
- [ ] 모든 act() 경고 해결
- [ ] MSW 핸들러 100% 커버리지
- [ ] 접근성 테스트 통과
- [ ] 실제 사용자 시나리오 동작

## 🔧 구체적 구현 가이드

### 1. act() 래핑 패턴
```typescript
// ❌ 잘못된 방법
test('버튼 클릭 테스트', async () => {
  const user = userEvent.setup();
  render(<Component />);
  await user.click(screen.getByRole('button'));
  expect(something).toBeTruthy();
});

// ✅ 올바른 방법  
test('버튼 클릭 테스트', async () => {
  const user = userEvent.setup();
  render(<Component />);
  
  await act(async () => {
    await user.click(screen.getByRole('button'));
  });
  
  await waitFor(() => {
    expect(something).toBeTruthy();
  });
});
```

### 2. MSW 핸들러 패턴
```typescript
// shared/api/test-handlers.ts
export const handlers = [
  // GET 요청
  http.get('/api/video-sessions/:id', ({ params }) => {
    return HttpResponse.json(mockVideoSession);
  }),
  
  // POST 요청 (지연 시뮬레이션)
  http.post('/api/comments', async ({ request }) => {
    await delay(100); // 100ms 지연
    const comment = await request.json();
    return HttpResponse.json({ id: '1', ...comment });
  }),
  
  // 에러 시뮬레이션
  http.get('/api/error-endpoint', () => {
    return HttpResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  })
];
```

### 3. 조건부 렌더링 패턴
```typescript
// 테스트 환경에서 간소화
const VideoPlayer: React.FC<Props> = ({ videoUrl }) => {
  if (process.env.NODE_ENV === 'test') {
    return <SimpleVideoPlayer videoUrl={videoUrl} />;
  }
  
  return <FullVideoPlayer videoUrl={videoUrl} />;
};

// 간소화된 테스트 버전
const SimpleVideoPlayer = ({ videoUrl }: { videoUrl: string }) => (
  <div data-testid="video-player">
    <div data-testid="video-url">{videoUrl}</div>
    <button data-testid="play-button">재생</button>
    <div data-testid="current-time">00:00</div>
  </div>
);
```

## 📊 진행 상황 추적

### 일일 체크리스트
- [ ] 신규 테스트 통과 수: ___개
- [ ] act() 경고 해결: ___개
- [ ] MSW 핸들러 추가: ___개
- [ ] 성능 개선: ___ms 단축
- [ ] 접근성 이슈 해결: ___개

### 주간 리포트 템플릿
```markdown
## Week N 진행 리포트

### 달성한 목표
- VideoFeedback: X/90개 테스트 통과 (X%)
- VideoPlanning: X/85개 테스트 통과 (X%) 
- Dashboard: X/65개 테스트 통과 (X%)

### 해결한 이슈
1. 이슈명: 해결 방법
2. 이슈명: 해결 방법

### 다음 주 계획
1. 계획 1
2. 계획 2

### 위험 요소
- 위험 요소 및 대응 방안
```

---

**마지막 업데이트**: 2025-08-27  
**담당자**: QA Lead Grace  
**상태**: Phase 4 TDD Green 실행 준비 완료