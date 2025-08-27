# VRidge 레거시 디자인 시스템 통합 UX 명세서

**Eleanor, UX Lead** | **Feature-Sliced Design (FSD) + Test-Driven Development (TDD) 기반**  
**버전**: 2.0 | **작성일**: 2025-08-26 | **목적**: 레거시 톤앤매너 유지하며 Tailwind CSS v4 통합

---

## I. 프로젝트 개요

### 플랫폼 비전
VRidge는 **초미니멀하고 세련된 디자인** 철학 하에, 비디오 제작 협업을 혁신하는 플랫폼입니다.

### 핵심 디자인 원칙
- **Legacy Tone & Manner 유지**: 기존 초미니멀, 세련된 디자인 엄격 보존
- **브랜드 색상 통일**: `#0031ff`, `#1631f8` 그라데이션 중심
- **Accessibility First**: 키보드 접근성, ARIA 속성, 포커스 관리 필수
- **Deterministic UX**: 재현 가능한 사용자 경험 보장

### 기술적 제약사항
- **FSD 아키텍처**: processes → widgets → features → entities → shared 계층 준수
- **디자인 토큰**: `design-tokens.scss` 변수만 사용, 하드코딩 금지
- **프로젝트별 색상**: 12-16% 저채도 틴트, 고유 Hue 할당

---

## II. 정보 아키텍처

### 전체 네비게이션 구조

```
VRidge Platform
├── 대시보드 (Dashboard)
│   ├── 새 피드 요약
│   ├── 초대 관리 요약
│   └── 편집 일정 간트 요약
│
├── 전체일정 (Calendar)
│   ├── 달력 뷰 (월/주)
│   ├── 간트 보드
│   └── 충돌 감지 시스템
│
├── 프로젝트 관리
│   ├── 프로젝트 생성
│   ├── 팀원 초대
│   └── 권한 관리 (RBAC)
│
├── 영상 기획 (NEW)
│   ├── STEP 1: 입력/선택
│   ├── STEP 2: 4단계 검토
│   └── STEP 3: 12숏 편집/콘티
│
└── 영상 피드백
    ├── 비디오 플레이어 (좌측)
    └── 탭 시스템 (우측)
        ├── 코멘트
        ├── 팀원
        └── 프로젝트 정보
```

### FSD 레이어별 매핑

| 사용자 기능 | FSD 레이어 | 구현 위치 |
|------------|-----------|----------|
| 대시보드 홈 | processes | `/processes/dashboard-overview/` |
| 프로젝트 생성 마법사 | processes | `/processes/project-creation/` |
| 영상 기획 3단계 | processes | `/processes/video-planning/` |
| 사이드바 네비게이션 | widgets | `/widgets/sidebar/` |
| 헤더 + 알림센터 | widgets | `/widgets/header/` |
| 프로젝트 카드 | widgets | `/widgets/project-card/` |
| 캘린더 뷰어 | widgets | `/widgets/calendar/` |
| 비디오 플레이어 | widgets | `/widgets/video-player/` |
| 댓글 시스템 | features | `/features/commenting/` |
| 파일 업로드 | features | `/features/file-upload/` |
| 팀 초대 | features | `/features/team-invite/` |

---

## III. 모듈별 사용자 플로우 명세서

### 1. 대시보드 모듈

#### 비즈니스 목표
서비스 전반 상태를 한눈에 파악하고 우선 액션(코멘트 확인·초대 관리·일정 확인)으로 빠르게 진입

#### 핵심 KPI
- **Task Success Rate**: 원하는 액션으로 3클릭 내 도달 90%
- **Time to Task**: 평균 액션 완료 시간 15초 이하
- **Drop-off Rate**: 대시보드 → 상세페이지 이동률 70% 이상

#### View-Model 상태 정의

```typescript
interface DashboardState {
  feedSummary: {
    newComments: number;
    newReplies: number;
    newReactions: number;
    status: 'empty' | 'loading' | 'success' | 'error';
  };
  
  invitesSummary: {
    sent: number;
    received: number;
    pending: number;
    status: 'empty' | 'loading' | 'success' | 'error';
  };
  
  projectsGantt: {
    projects: ProjectGanttItem[];
    timespan: 'week' | 'month';
    status: 'empty' | 'loading' | 'success' | 'error';
  };
  
  unreadBadges: {
    [key: string]: number; // 최대 9+로 제한
  };
}
```

#### Gherkin E2E 시나리오

```gherkin
Feature: 대시보드 홈화면
  서비스 전반 상태 파악과 빠른 액션 진입점 제공

  Background:
    Given 사용자가 로그인되어 있다
    And 사용자는 3개의 활성 프로젝트를 보유하고 있다
    And 읽지 않은 코멘트가 7개 있다

  Scenario: 대시보드 첫 방문 시 전체 상태 로드
    Given 사용자가 VRidge 플랫폼에 접속한다
    When 대시보드 페이지가 로드된다
    Then 새 피드 요약이 "7개 새 코멘트" 로 표시된다
    And 초대 관리 요약이 "2개 전송, 1개 받음" 으로 표시된다
    And 편집 일정 간트가 주간 뷰로 표시된다
    And 읽지 않음 배지가 "7" 로 표시된다
    And 모든 로딩이 3초 내에 완료된다

  Scenario: 읽지 않음 배지 클릭 시 자동 읽음 처리
    Given 사용자가 대시보드에 있다
    And 프로젝트 A에 읽지 않은 코멘트가 5개 있다
    When 프로젝트 A의 읽지 않음 배지를 클릭한다
    Then 프로젝트 A 피드백 페이지로 이동한다
    And 배지 숫자가 "5"에서 "0"으로 변경된다
    And aria-label이 "읽지 않은 알림 없음"으로 갱신된다

  Scenario: 9+ 배지 표시 제한
    Given 프로젝트 B에 읽지 않은 알림이 25개 있다
    When 대시보드를 새로고침한다
    Then 배지가 "9+"로 표시된다
    And 툴팁에 "25개의 읽지 않은 알림"이 표시된다

  Scenario: 빈 상태 처리
    Given 신규 사용자가 첫 접속한다
    When 대시보드를 로드한다
    Then "새 프로젝트 만들기" CTA가 표시된다
    And 빈 상태 일러스트가 표시된다
    And "프로젝트를 만들어 협업을 시작해보세요" 메시지가 표시된다

  Scenario: 오류 상태 복구 플로우
    Given 사용자가 대시보드에 있다
    When 네트워크 연결이 끊어진다
    Then "연결에 문제가 발생했습니다" 메시지가 표시된다
    And "다시 시도" 버튼이 제공된다
    When "다시 시도" 버튼을 클릭한다
    Then 데이터 재로드가 시도된다
```

#### 접근성 요구사항
- **키보드 접근**: Tab 순서 → 새 피드 → 초대 → 간트 → 빠른액션
- **스크린 리더**: 배지 숫자 변경 시 aria-live="polite" 공지
- **포커스 관리**: 모달 열림/닫힘 시 포커스 트랩
- **Color Contrast**: WCAG AA 기준 4.5:1 이상

#### 마이크로카피

```yaml
Empty States:
  no_projects: "아직 프로젝트가 없습니다"
  no_notifications: "읽지 않은 알림이 없습니다"
  no_recent_activity: "최근 활동이 없습니다"

Error States:
  network_error: "연결에 문제가 발생했습니다"
  load_failed: "데이터를 불러올 수 없습니다"
  
Success States:
  all_read: "모든 알림을 확인했습니다"
  data_refreshed: "최신 정보로 업데이트되었습니다"

Actions:
  mark_all_read: "모두 읽음"
  refresh: "새로고침"
  create_project: "새 프로젝트 만들기"
```

---

### 2. 캘린더 모듈

#### 비즈니스 목표
모든 프로젝트의 기획-촬영-편집 일정을 통합 관리하며, 촬영 일정 충돌만 경고

#### 핵심 KPI
- **충돌 감지 정확도**: 촬영 일정 충돌 100% 감지
- **일정 조정 성공률**: 충돌 해결 80% 이상
- **캘린더 사용률**: 활성 프로젝트의 90% 이상 일정 등록

#### View-Model 상태 정의

```typescript
interface CalendarState {
  view: 'month' | 'week';
  currentDate: Date;
  
  projects: ProjectSchedule[];
  filters: {
    selectedProjects: string[];
    showConflictsOnly: boolean;
    selectedPhases: ('planning' | 'shooting' | 'editing')[];
  };
  
  conflicts: {
    type: 'shooting_overlap';
    projectIds: [string, string];
    conflictPeriod: DateRange;
    severity: 'warning' | 'critical';
  }[];
  
  colorLegend: {
    projectId: string;
    projectName: string;
    hue: number; // 0-360
    isVisible: boolean;
  }[];
  
  status: 'loading' | 'success' | 'error';
}
```

#### Gherkin E2E 시나리오

```gherkin
Feature: 캘린더 일정 관리
  프로젝트별 기획-촬영-편집 일정의 통합 뷰와 충돌 감지

  Background:
    Given 사용자가 "Project A"와 "Project B"를 보유하고 있다
    And Project A는 hue 240° (블루 계열)로 설정되어 있다
    And Project B는 hue 120° (그린 계열)로 설정되어 있다

  Scenario: 캘린더 월간 뷰 기본 표시
    Given 사용자가 캘린더 페이지에 접속한다
    When 2025년 9월 월간 뷰를 로드한다
    Then Project A의 기획 일정이 블루 12% 틴트로 표시된다
    And Project A의 촬영 일정이 블루 원색 좌측 보더로 표시된다
    And Project A의 편집 일정이 블루 16% 틴트로 표시된다
    And 우상단에 색상 범례가 고정 표시된다

  Scenario: 촬영 일정 충돌 감지 및 표시
    Given Project A 촬영이 9월 15일로 예정되어 있다
    When Project B 촬영을 9월 15일로 드래그한다
    Then 두 프로젝트 블록 모두 점선 테두리로 표시된다
    And 경고 아이콘이 각 블록에 표시된다
    And 옅은 사선 패턴이 오버레이된다
    And 툴팁에 "Project A와 촬영 일정 충돌"이 표시된다

  Scenario: '충돌만 보기' 필터 동작
    Given 캘린더에 충돌하는 촬영 일정 2개와 충돌하지 않는 일정 5개가 있다
    When '충돌만 보기' 체크박스를 활성화한다
    Then 충돌하는 2개 일정만 표시된다
    And 다른 5개 일정은 숨겨진다
    And 페이지 제목이 "충돌 일정 (2개)"로 변경된다

  Scenario: 프로젝트별 색상 범례 관리
    Given 캘린더에 7개 프로젝트가 로드되어 있다
    When 우상단 범례에서 "Project C" 색상칩을 클릭한다
    Then Project C 관련 일정만 하이라이트된다
    And 다른 프로젝트 일정은 50% 투명도로 표시된다
    When "전체/내 프로젝트" 토글을 '내 프로젝트'로 변경한다
    Then 사용자가 소유한 프로젝트만 범례에 표시된다

  Scenario: 기획/편집 일정 충돌 무시 확인
    Given Project A 기획이 9월 10-12일로 설정되어 있다
    When Project B 기획을 9월 11-13일로 설정한다
    Then 어떤 충돌 경고도 표시되지 않는다
    And 두 일정 모두 정상적인 틴트 색상으로 표시된다

  Scenario: 드래그 앤 드롭 일정 조정
    Given 사용자가 Project A 촬영 일정 편집 권한을 보유한다
    When 9월 15일 촬영 블록을 9월 20일로 드래그한다
    Then 실시간으로 위치가 변경된다
    And 충돌이 해결되면 점선 테두리가 제거된다
    And "일정이 변경되었습니다" 토스트가 표시된다

  Scenario: 권한 없는 일정 수정 방지
    Given 사용자가 Project B의 viewer 권한만 보유한다
    When Project B의 편집 일정을 드래그하려고 한다
    Then 드래그가 비활성화된다
    And 커서가 "not-allowed"로 변경된다
    And 툴팁에 "편집 권한이 없습니다"가 표시된다
```

#### 접근성 요구사항
- **키보드 접근**: 화살표 키로 날짜 간 이동
- **스크린 리더**: 충돌 감지 시 aria-live="assertive" 공지
- **포커스 표시**: 현재 선택된 날짜/일정 명확한 아웃라인
- **Color Independence**: 색상 외에 패턴, 아이콘으로 정보 전달

---

### 3. 프로젝트 관리 모듈

#### 비즈니스 목표
프로젝트 생성·기본 설정·권한과 초대 메일 발송으로 협업 시작을 신속화

#### 핵심 KPI
- **프로젝트 생성 완료율**: 마법사 시작 대비 90% 이상 완료
- **자동 일정 적용률**: 디폴트 일정 그대로 사용 60% 이상
- **초대 수락률**: 발송 대비 85% 이상 수락

#### View-Model 상태 정의

```typescript
interface ProjectCreationState {
  step: 1 | 2 | 3; // 3단계 마법사
  
  // Step 1: 기본 정보
  basicInfo: {
    title: string;
    description: string;
    category: ProjectCategory;
    status: 'idle' | 'validating' | 'valid' | 'invalid';
    errors: ValidationError[];
  };
  
  // Step 2: 자동 일정 미리보기
  schedulePreview: {
    planning: { duration: number; unit: 'days' | 'weeks' }; // 기본: 1주
    shooting: { duration: number; unit: 'days' | 'weeks' }; // 기본: 1일  
    editing: { duration: number; unit: 'days' | 'weeks' }; // 기본: 2주
    startDate: Date;
    isCustom: boolean;
    status: 'preview' | 'custom' | 'confirmed';
  };
  
  // Step 3: 팀 초대
  teamInvites: {
    email: string;
    role: 'owner' | 'admin' | 'editor' | 'reviewer' | 'viewer';
    expiresAt: Date;
    cooldownRemaining?: number; // 재전송 대기시간 (초)
    status: 'pending' | 'sending' | 'sent' | 'failed' | 'accepted' | 'declined';
  }[];
  
  createStatus: 'idle' | 'creating' | 'success' | 'failed';
}
```

#### Gherkin E2E 시나리오

```gherkin
Feature: 프로젝트 생성 마법사
  신속한 프로젝트 설정과 팀 구성을 위한 3단계 가이드

  Scenario: 자동 일정으로 프로젝트 생성 완료
    Given 사용자가 "새 프로젝트" 버튼을 클릭했다
    When Step 1에서 제목 "홍보영상 제작"을 입력한다
    And 설명 "브랜드 론칭 홍보영상"을 입력한다
    And "다음" 버튼을 클릭한다
    Then Step 2에서 자동 일정 프리뷰가 표시된다
    And 기획 1주, 촬영 1일, 편집 2주 바가 표시된다
    And 시작일이 내일로 자동 설정된다
    When "그대로 사용" 버튼을 클릭한다
    And Step 3에서 "건너뛰기"를 클릭한다
    Then 프로젝트가 성공적으로 생성된다
    And 프로젝트 상세 페이지로 이동한다

  Scenario: 사용자 정의 일정으로 프로젝트 생성
    Given 사용자가 Step 2 자동 일정 화면에 있다
    When "수동 설정" 토글을 활성화한다
    Then 기획, 촬영, 편집 필드가 편집 가능해진다
    When 기획을 "2주"로 변경한다
    And 편집을 "3주"로 변경한다
    Then 프리뷰 바가 즉시 "2주/1일/3주"로 업데이트된다
    And 전체 기간이 "약 6주"로 계산된다
    When 시작일을 "2025-09-15"로 변경한다
    Then 각 단계별 종료일이 자동 계산되어 표시된다

  Scenario: 팀원 초대 및 재전송 쿨다운
    Given 사용자가 Step 3 팀 초대 화면에 있다
    When 이메일 "editor@example.com"을 입력한다
    And 역할을 "Editor"로 선택한다
    And 만료일을 "7일 후"로 설정한다
    And "초대 보내기" 버튼을 클릭한다
    Then SendGrid를 통해 초대 이메일이 발송된다
    And 상태가 "전송됨"으로 변경된다
    When 다시 "재전송" 버튼을 클릭한다
    Then "60초 후에 재전송 가능합니다" 메시지가 표시된다
    And 재전송 버튼이 비활성화된다
    And 60초 카운트다운이 표시된다

  Scenario: 입력 유효성 검사 및 오류 처리
    Given 사용자가 Step 1에서 빈 제목으로 "다음"을 클릭한다
    Then "프로젝트 제목은 필수입니다" 오류가 표시된다
    And 제목 필드에 빨간색 테두리가 표시된다
    And 포커스가 제목 필드로 이동한다
    When 제목에 "A"를 입력한다
    Then "최소 2글자 이상 입력해주세요" 오류가 표시된다
    When 제목을 "홍보영상"으로 변경한다
    Then 오류가 사라지고 "다음" 버튼이 활성화된다

  Scenario: 프로젝트 생성 실패 시 복구
    Given 사용자가 모든 정보를 입력하고 Step 3에 있다
    When "프로젝트 생성" 버튼을 클릭한다
    And 서버에서 500 오류가 발생한다
    Then "프로젝트 생성에 실패했습니다" 오류 메시지가 표시된다
    And "다시 시도" 버튼이 제공된다
    And 입력한 정보는 모두 보존된다
    When "다시 시도" 버튼을 클릭한다
    Then 같은 데이터로 재시도한다
```

#### 마이크로카피

```yaml
Step Titles:
  step_1: "프로젝트 기본 정보"
  step_2: "제작 일정 설정"
  step_3: "팀원 초대"

Auto Schedule:
  planning_default: "기획 1주"
  shooting_default: "촬영 1일" 
  editing_default: "편집 2주"
  total_duration: "총 소요기간"
  starts_tomorrow: "내일부터 시작"

Team Invites:
  invite_sent: "초대장을 발송했습니다"
  cooldown_message: "{count}초 후에 재전송 가능합니다"
  role_descriptions:
    owner: "모든 권한 (삭제 포함)"
    admin: "설정 변경 및 멤버 관리"
    editor: "콘텐츠 편집 및 업로드"
    reviewer: "댓글 작성 및 승인"
    viewer: "보기 전용"

Validation Errors:
  title_required: "프로젝트 제목은 필수입니다"
  title_min_length: "최소 2글자 이상 입력해주세요"
  title_max_length: "제목은 50글자를 초과할 수 없습니다"
  invalid_email: "올바른 이메일 주소를 입력해주세요"
  duplicate_email: "이미 초대된 이메일입니다"
```

---

### 4. 영상 기획 모듈 (신규 기능)

#### 비즈니스 목표
한 줄 스토리 → 4단계 → 12숏 → 콘티/인서트 → JSON + Marp PDF까지 자동·반자동 기획 산출

#### 핵심 KPI
- **기획 완료율**: 3단계 마법사 완주 75% 이상
- **AI 생성 만족도**: 생성된 4단계/12숏 만족도 4.0/5.0 이상
- **PDF 다운로드율**: 완료된 기획의 90% 이상 PDF 생성

#### View-Model 상태 정의

```typescript
interface VideoPlanningState {
  currentStep: 1 | 2 | 3;
  
  // Step 1: 입력/선택
  input: {
    title: string;
    logline: string; // 한 줄 스토리
    tone: 'calm' | 'cheerful' | 'thrilling' | 'cute' | 'chic' | 'dramatic';
    genre: 'drama' | 'horror' | 'sf' | 'action' | 'ad' | 'documentary';
    target: string;
    duration: '30sec' | '60sec' | '90sec' | '120sec';
    format: 'interview' | 'storytelling' | 'animation' | 'motion_graphics';
    tempo: 'fast' | 'normal' | 'slow';
    structure: 'hook-immersion-twist-hint' | 'intro-development-twist-conclusion' | 'inductive' | 'deductive' | 'documentary' | 'pixar';
    intensity: 'as_is' | 'moderate' | 'rich';
    selectedPreset?: string;
  };
  
  // Step 2: 4단계 검토/수정
  fourStages: {
    stage: 1 | 2 | 3 | 4;
    title: string;
    summary: string;
    content: string;
    goal: string;
    durationHint: string;
    status: 'generated' | 'editing' | 'confirmed';
    history: { content: string; timestamp: Date }[]; // 되돌리기용
  }[];
  
  // Step 3: 12숏 편집
  twelveShots: {
    id: string;
    stageId: 1 | 2 | 3 | 4; // 소속 단계
    title: string;
    description: string;
    shotType: string; // 롱샷, 미디엄, 클로즈업 등
    cameraWork: string;
    composition: string;
    duration: number; // 초 단위
    dialogue: string;
    subtitle: string;
    audio: string;
    transition: string;
    
    // 콘티 이미지
    storyboard: {
      imageUrl?: string;
      prompt: string;
      status: 'none' | 'generating' | 'completed' | 'failed';
    };
    
    // 인서트 3컷 추천
    inserts: {
      purpose: 'information' | 'rhythm' | 'relationship' | 'detail';
      description: string;
      framing: string;
      status: 'suggested' | 'confirmed' | 'regenerating';
    }[];
  }[];
  
  // 생성 및 내보내기 상태
  generation: {
    currentStage: 'idle' | 'generating_4stages' | 'generating_12shots' | 'generating_storyboards';
    progress: number; // 0-100
    error?: string;
  };
  
  export: {
    jsonReady: boolean;
    pdfReady: boolean;
    marpTheme: 'light' | 'dark';
    status: 'idle' | 'generating' | 'completed' | 'failed';
  };
}
```

#### Gherkin E2E 시나리오

```gherkin
Feature: 영상 기획 자동화 도구
  AI 기반 스토리보드 생성부터 PDF 산출까지 통합 기획 워크플로우

  Background:
    Given 사용자가 새 프로젝트를 생성했다
    And "영상 기획" 메뉴로 이동한다
    And Google Gemini API 키가 Railway에서 설정되어 있다

  Scenario: 프리셋을 사용한 빠른 기획 생성
    Given 사용자가 Step 1 입력 화면에 있다
    When "브랜드30초·빠른·훅몰반" 프리셋 버튼을 클릭한다
    Then 톤앤매너가 "시크"로 자동 선택된다
    And 장르가 "광고"로 자동 선택된다
    And 분량이 "30초"로 자동 선택된다
    And 전개 방식이 "훅-몰입-반전-떡밥"으로 자동 선택된다
    And 템포가 "빠르게"로 자동 선택된다
    When 제목 "브랜드 런칭 영상"과 로그라인 "혁신 브랜드의 첫 시작"을 입력한다
    And "4단계 생성" 버튼을 클릭한다
    Then Railway의 Google Gemini API가 호출된다
    And 30초 내에 4단계 초안이 생성된다

  Scenario: 4단계 생성 및 인라인 편집
    Given 4단계가 성공적으로 생성되었다
    When Step 2 화면이 로드된다
    Then 4개 카드가 "기-승-전-결" 순서로 표시된다
    And 각 카드에 요약/본문/목표/길이 힌트가 포함된다
    When 두 번째 카드의 본문을 클릭한다
    Then 인라인 에디터가 활성화된다
    And 원본 텍스트가 선택된 상태로 표시된다
    When 내용을 "브랜드의 핵심 가치 전달"로 수정한다
    And Enter 키를 누른다
    Then 변경사항이 저장된다
    And "되돌리기" 버튼이 활성화된다

  Scenario: 12숏 자동 분해 및 콘티 생성
    Given 사용자가 4단계 검토를 완료했다
    When "12숏 생성" 버튼을 클릭한다
    Then 정확히 12개 숏이 생성된다 (4단계 × 3숏)
    And 각 숏의 길이가 템포에 맞게 설정된다 (빠름: 4-6초)
    When 첫 번째 숏의 "콘티 생성" 버튼을 클릭한다
    Then Google 이미지 생성 API가 호출된다
    And "storyboard pencil sketch, rough, monochrome" 스타일로 생성된다
    And 네거티브 프롬프트로 "glitch, text overlay"가 적용된다
    And 생성 완료 시 이미지가 숏 카드 좌측에 표시된다

  Scenario: 인서트 3컷 추천 시스템
    Given 12숏 그리드가 표시되어 있다
    When 다섯 번째 숏을 선택한다
    Then 3개 인서트 추천이 하단에 표시된다
    And 각 인서트의 목적이 중복되지 않는다 (정보/리듬/관계)
    And 추천 설명과 프레이밍이 포함된다
    When "리듬 강화" 인서트의 "재생성" 버튼을 클릭한다
    Then 새로운 추천으로 대체된다
    And 목적은 "리듬"으로 유지된다

  Scenario: Marp PDF 생성 및 다운로드
    Given 사용자가 12숏 편집을 완료했다
    When "PDF 내보내기" 버튼을 클릭한다
    And Light 테마를 선택한다
    Then Marp 마크다운이 생성된다
    And A4 가로 형식으로 설정된다
    And 여백이 0으로 설정된다
    When PDF 변환이 완료된다
    Then 표지 페이지에 제목과 메타정보가 포함된다
    And 4단계 개요가 2×2 카드 형태로 표시된다
    And 12개 숏이 각각 한 페이지에 표시된다
    And 각 페이지 하단에 "VLANET • {프로젝트명} • {p}/{n}" 푸터가 표시된다
    And JSON 파일과 PDF 파일이 동시에 다운로드된다

  Scenario: LLM 생성 실패 시 오류 처리
    Given 사용자가 Step 1에서 정보를 입력했다
    When "4단계 생성" 버튼을 클릭한다
    And Google Gemini API가 응답하지 않는다
    Then "AI 생성에 실패했습니다" 오류 메시지가 표시된다
    And "다시 시도" 버튼이 제공된다
    And 입력한 정보는 보존된다
    When "다시 시도" 버튼을 클릭한다
    Then 동일한 프롬프트로 재시도한다

  Scenario: 중간 저장 및 세션 복원
    Given 사용자가 Step 2에서 4단계를 편집 중이다
    When 브라우저를 새로고침한다
    Then 편집 중이던 내용이 복원된다
    And 변경 이력이 유지된다
    And 현재 단계(Step 2)가 유지된다
```

#### 접근성 요구사항
- **키보드 접근**: 3단계 마법사 Tab 순서 일관성
- **스크린 리더**: AI 생성 진행률 aria-live="polite" 공지
- **대체 텍스트**: 생성된 콘티 이미지에 설명 추가
- **포커스 관리**: 모달 다이얼로그 포커스 트랩

---

### 5. 영상 피드백 모듈

#### 비즈니스 목표
비디오 재생 + 타임코드 기반 코멘트 협업으로 리뷰 효율 향상 (실시간 제외)

#### 핵심 KPI
- **피드백 작성률**: 비디오당 평균 8개 이상
- **피드백 해결률**: 작성된 피드백의 85% 이상 해결
- **협업 만족도**: 피드백 시스템 만족도 4.5/5.0 이상
- **타임코드 정확도**: 의도한 시점 ±1초 내 99% 달성

#### View-Model 상태 정의

```typescript
interface VideoFeedbackState {
  // 좌측: 비디오 플레이어
  player: {
    videoUrl: string;
    currentTime: number; // 초 단위
    duration: number;
    isPlaying: boolean;
    volume: number;
    playbackRate: 1 | 1.25 | 1.5 | 2;
    isFullscreen: boolean;
    status: 'loading' | 'ready' | 'error';
  };
  
  // 우측: 탭 시스템
  activeTab: 'comments' | 'team' | 'project_info';
  
  // 코멘트 탭
  comments: {
    id: string;
    timecode: number; // 초 단위
    author: User;
    content: string;
    attachments: MediaFile[];
    reactions: {
      like: number;
      dislike: number; 
      question: number;
      userReaction?: 'like' | 'dislike' | 'question';
    };
    replies: Reply[];
    status: 'open' | 'resolved' | 'archived';
    createdAt: Date;
    resolvedAt?: Date;
  }[];
  
  // 코멘트 입력 상태
  commentInput: {
    content: string;
    timecode?: number; // 현재 시점 코멘트 시 자동 설정
    attachments: File[];
    isSubmitting: boolean;
    errors: ValidationError[];
  };
  
  // 필터/정렬
  filters: {
    sortBy: 'timecode' | 'newest' | 'resolved';
    showResolved: boolean;
    filterByAuthor?: string;
  };
  
  // 팀원 탭
  teamMembers: {
    id: string;
    email: string;
    role: ProjectRole;
    status: 'invited' | 'active' | 'inactive';
    lastActive?: Date;
    inviteCooldown?: number; // 재전송 대기시간
  }[];
  
  // 프로젝트 정보 탭
  projectInfo: {
    title: string;
    version: string;
    duration: string;
    resolution: string;
    fileSize: string;
    uploadedAt: Date;
    shareSettings: {
      isPublic: boolean;
      expiresAt?: Date;
      password?: string;
    };
    miniGantt: {
      planning: { progress: number; endDate: Date };
      shooting: { progress: number; endDate: Date };
      editing: { progress: number; endDate: Date };
    };
  };
}
```

#### Gherkin E2E 시나리오

```gherkin
Feature: 영상 피드백 시스템
  타임코드 기반 비디오 협업 플랫폼

  Background:
    Given 프로젝트 "홍보영상"에 "sample_video.mp4"가 업로드되어 있다
    And 비디오 길이는 120초이다
    And 사용자가 편집자 권한을 보유한다

  Scenario: 타임코드 자동 반영 코멘트 작성
    Given 사용자가 영상 피드백 페이지에 있다
    When 비디오를 30초 지점까지 재생한다
    And 일시정지한다
    And "현재 시점 코멘트" 버튼을 클릭한다 (또는 T 키를 누른다)
    Then 댓글 입력란 선두에 "[00:30.000]"이 자동 삽입된다
    And 커서가 시간코드 뒤에 위치한다
    When "이 장면의 색감을 더 따뜻하게 조정해주세요"를 입력한다
    And "코멘트 등록" 버튼을 클릭한다
    Then 30초 지점에 코멘트 마커가 표시된다
    And 우측 코멘트 목록에 타임코드순으로 정렬되어 표시된다

  Scenario: 중복 타임코드 방지 및 커서 유지
    Given 댓글 입력란에 "[01:15.500] 기존 내용"이 있다
    When 비디오를 45초로 이동한다
    And "현재 시점 코멘트" 버튼을 클릭한다
    Then "[01:15.500]"이 "[00:45.000]"으로 교체된다 (중복 방지)
    And 커서가 원래 위치에 유지된다
    And 기존 텍스트 "기존 내용"은 보존된다

  Scenario: 스크린샷 첨부 및 파일명 규칙
    Given 사용자가 비디오 68초 지점에 있다
    When "스크린샷" 버튼을 클릭한다
    Then 현재 프레임이 캡처된다
    And 파일명이 "project-{slug}_TC0010800_{YYYY-MM-DD}T{HHmmss}.jpg" 형식으로 생성된다
    And 댓글 입력란에 미리보기 썸네일이 표시된다
    When 캡처된 이미지와 함께 "음향 효과를 추가해주세요" 코멘트를 작성한다
    Then 68초 마커에 이미지 아이콘이 표시된다
    And 댓글 목록에 썸네일과 함께 표시된다

  Scenario: 감정표현 3종 및 대댓글 스레드
    Given 30초 지점에 "색감 조정" 코멘트가 있다
    When 다른 사용자가 해당 코멘트에 "좋아요" 반응을 클릭한다
    Then 좋아요 카운트가 1 증가한다
    And 반응한 사용자 정보가 툴팁에 표시된다
    When 동일 코멘트에 "완료했습니다" 대댓글을 작성한다
    Then 스레드 형태로 들여쓰기되어 표시된다
    And 원본 코멘트 작성자에게 알림이 발송된다

  Scenario: 피드백 상태 관리 및 통계 업데이트
    Given 프로젝트에 "열림" 상태 피드백 5개가 있다
    When 피드백 작성자가 상태를 "해결됨"으로 변경한다
    Then 해당 피드백이 회색 배경으로 표시된다
    And 체크 아이콘이 추가된다
    And 우측 프로젝트 정보 탭의 통계가 "4개 열림, 1개 해결됨"으로 업데이트된다
    When 필터에서 "해결된 피드백 숨기기"를 활성화한다
    Then 해결된 피드백이 목록에서 숨겨진다
    And 비디오 플레이어의 해당 마커도 숨겨진다

  Scenario: 팀원 초대 및 재전송 관리
    Given 사용자가 "팀원" 탭에 있다
    When "새 팀원 초대" 버튼을 클릭한다
    And "reviewer@example.com" 이메일을 입력한다
    And 역할을 "Reviewer"로 선택한다
    And "초대 보내기" 버튼을 클릭한다
    Then 초대 상태가 "전송됨"으로 표시된다
    And SendGrid를 통해 초대 이메일이 발송된다
    When 30초 후 "재전송" 버튼을 클릭한다
    Then "30초 후에 재전송 가능합니다" 메시지가 표시된다
    And 재전송 버튼이 비활성화된다

  Scenario: 프로젝트 공유 설정 및 만료일 관리
    Given 사용자가 "프로젝트 정보" 탭에 있다
    When "공유 설정" 섹션에서 "공개 링크 생성"을 클릭한다
    Then 공유 가능한 URL이 생성된다
    And "링크 복사" 버튼이 표시된다
    When 만료일을 "7일 후"로 설정한다
    And 비밀번호를 "review123"으로 설정한다
    Then 공유 설정이 저장된다
    And 외부 사용자가 해당 링크로 접근 시 비밀번호를 요구받는다

  Scenario: 비디오 업로드/교체 플로우
    Given 사용자가 비디오 플레이어 영역에 있다
    When "교체" 버튼을 클릭한다
    And 새 비디오 파일을 선택한다
    Then 업로드 진행률이 표시된다
    And 기존 코멘트들의 타임코드는 유지된다
    When 업로드가 완료된다
    Then 새 비디오로 교체된다
    And "비디오가 업데이트되었습니다" 토스트가 표시된다
    And 기존 코멘트 마커들이 새 비디오에 계속 표시된다

  Scenario: 키보드 단축키 및 접근성
    Given 사용자가 비디오에 포커스를 맞춘 상태다
    When Space 키를 누른다
    Then 재생/일시정지가 토글된다
    When 화살표 좌/우 키를 누른다
    Then 5초씩 앞뒤로 이동한다
    When T 키를 누른다
    Then 현재 시점 코멘트 입력 모드가 활성화된다
    When Escape 키를 누른다
    Then 전체화면 모드가 해제된다
    And 포커스가 적절한 요소로 복원된다
```

#### 접근성 요구사항
- **키보드 접근**: 플레이어 → 탭 → 코멘트 목록 순서
- **스크린 리더**: 타임코드 "[분:초.밀리초]" 형식 읽기
- **포커스 관리**: 모달 열림 시 포커스 트랩, 닫힘 시 복원
- **대체 수단**: 마우스 외 키보드로 모든 기능 접근 가능

---

## IV. 전역 UI 컴포넌트 설계

### 서브메뉴 시스템

#### 공통 디자인 원칙
- **투명도**: 90% (라이트/다크 일관)
- **포커스 트랩**: 활성화 시 내부 요소만 접근
- **ESC 처리**: 언제든 메뉴 닫기 가능
- **바깥 클릭**: 메뉴 영역 외부 클릭 시 자동 닫기

#### 키보드 접근성
```yaml
Navigation Keys:
  Tab: "다음 메뉴 항목으로 이동"
  Shift+Tab: "이전 메뉴 항목으로 이동"
  Arrow Up/Down: "메뉴 항목 간 이동"
  Enter/Space: "메뉴 항목 활성화"
  Escape: "메뉴 닫기"

ARIA Attributes:
  role: "menu"
  aria-labelledby: "메뉴 트리거 버튼 ID"
  aria-expanded: "메뉴 열림/닫힘 상태"
  role="menuitem": "각 메뉴 항목"
```

### 알림 센터

#### 구성 요소
- **트리거**: 헤더 벨 아이콘 (읽지 않은 수 배지)
- **드로어**: 최근 10개 알림 목록
- **알림 유형**: 초대, 코멘트/대댓글/리액션, 촬영 충돌 경고

#### 상태 관리
```typescript
interface NotificationCenter {
  isOpen: boolean;
  notifications: Notification[];
  unreadCount: number;
  lastRefresh: Date;
  status: 'loading' | 'success' | 'error';
}

interface Notification {
  id: string;
  type: 'invite' | 'comment' | 'reply' | 'reaction' | 'schedule_conflict';
  title: string;
  description: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: Date;
  relatedProject?: string;
}
```

#### 접근성 명세
- **포커스 트랩**: 드로어 열림 시 내부에만 포커스 제한
- **ESC 처리**: 드로어 즉시 닫기
- **aria-label**: "새 알림 {count}개" 동적 갱신
- **읽음 처리**: 알림 클릭 시 즉시 읽음 상태로 변경

---

## V. View-Model 상태 매트릭스

### 공통 상태 패턴

모든 데이터 로딩은 다음 4가지 상태를 반드시 지원:

| 상태 | 설명 | UI 표시 | 사용자 액션 |
|------|------|---------|-----------|
| `empty` | 데이터 없음 | 빈 상태 일러스트 + CTA | 새 항목 생성 가능 |
| `loading` | 데이터 로딩 중 | 스켈레톤 UI | 대기 상태, 취소 가능 |
| `success` | 데이터 로드 성공 | 실제 데이터 표시 | 모든 인터랙션 활성화 |
| `error` | 데이터 로드 실패 | 오류 메시지 + 재시도 | 재시도 또는 대안 경로 |

### 입력 필드 상태

모든 폼 필드는 다음 상태 순환:

```typescript
type FieldState = 'idle' | 'focus' | 'validating' | 'valid' | 'invalid';

interface ValidationResult {
  isValid: boolean;
  errors: {
    code: string;
    message: string;
    field: string;
  }[];
  warnings?: string[];
}
```

### 비동기 액션 상태

모든 API 호출이나 파일 업로드는 다음 패턴을 따름:

```typescript
interface AsyncAction<T> {
  status: 'idle' | 'pending' | 'fulfilled' | 'rejected';
  data?: T;
  error?: {
    message: string;
    code: string;
    statusCode?: number;
  };
  progress?: number; // 0-100, 업로드 등에서 사용
}
```

---

## VI. 접근성 기준선 요구사항

### WCAG 2.1 AA 준수

#### 1. 지각 가능성 (Perceivable)
- **색상 독립성**: 색상만으로 정보 전달 금지 (패턴, 아이콘 병행)
- **대비율**: 텍스트 4.5:1, 대형 텍스트 3:1 이상
- **반응형 줌**: 400% 확대 시에도 수평 스크롤 없이 사용 가능
- **미디어 대체**: 비디오에 자막 지원, 이미지에 적절한 alt 텍스트

#### 2. 운용 가능성 (Operable)
- **키보드 접근**: 모든 기능이 키보드만으로도 100% 접근 가능
- **포커스 가시성**: 포커스 링 최소 2px, 대비율 3:1 이상
- **시간 제한**: 자동 로그아웃 전 경고, 연장 옵션 제공
- **애니메이션**: prefers-reduced-motion 설정 존중

#### 3. 이해 가능성 (Understandable)
- **언어 설정**: html lang="ko" 명시
- **오류 식별**: 구체적이고 건설적인 오류 메시지
- **레이블 연결**: 모든 폼 필드에 명시적 레이블 연결
- **일관성**: 동일 기능은 동일한 방식으로 작동

#### 4. 견고성 (Robust)
- **ARIA 사용**: 의미론적 HTML 우선, 필요시 ARIA 보완
- **스크린 리더**: NVDA, JAWS, VoiceOver 테스트 필수
- **브라우저 호환**: Chrome, Firefox, Safari, Edge 지원

### 구현 체크리스트

```yaml
페이지 레벨:
  - [ ] 페이지 제목 명시 및 문맥 반영
  - [ ] 메인 랜드마크(main, nav, aside) 설정
  - [ ] 건너뛰기 링크 제공 ("본문으로 건너뛰기")
  
폼 요소:
  - [ ] 모든 input에 label 연결 (for/id 또는 aria-labelledby)
  - [ ] 필수 필드에 aria-required="true" 
  - [ ] 오류 메시지 aria-describedby로 연결
  - [ ] 필드셋(fieldset)과 범례(legend) 적절히 사용
  
인터랙션:
  - [ ] 버튼에 명확한 텍스트 또는 aria-label
  - [ ] 링크 목적 명확성 (맥락 없이도 이해 가능)
  - [ ] 드롭다운/모달 aria-expanded 상태 반영
  - [ ] 탭 패널 aria-controls, aria-labelledby 연결
  
미디어:
  - [ ] 이미지 alt 텍스트 (장식용은 alt="")
  - [ ] 비디오 컨트롤 키보드 접근 가능
  - [ ] 자동재생 금지 또는 제어 수단 제공
```

---

## VII. 인스트루멘테이션 맵

### 이벤트 정의

모든 사용자 행동은 다음 스키마로 추적:

```typescript
interface AnalyticsEvent {
  event_name: string;
  timestamp: number;
  user_id?: string;
  session_id: string;
  page_url: string;
  user_agent: string;
  
  // 이벤트별 커스텀 속성
  properties: {
    [key: string]: string | number | boolean;
  };
}
```

### 모듈별 핵심 이벤트

#### 대시보드 모듈
```yaml
dashboard_viewed:
  description: "대시보드 페이지 진입"
  properties:
    - projects_count: number
    - unread_notifications: number
    - load_time_ms: number

unread_badge_clicked:
  description: "읽지 않음 배지 클릭"
  properties:
    - project_id: string
    - badge_count: number
    - destination_page: string
```

#### 프로젝트 생성 모듈
```yaml
project_creation_started:
  description: "프로젝트 생성 마법사 시작"
  
project_creation_step_completed:
  description: "마법사 단계 완료"
  properties:
    - step: number (1|2|3)
    - time_on_step_seconds: number
    
auto_schedule_used:
  description: "자동 일정 그대로 사용"
  properties:
    - planning_weeks: number
    - shooting_days: number
    - editing_weeks: number

team_invite_sent:
  description: "팀원 초대 발송"
  properties:
    - invite_count: number
    - roles: string[] (role 목록)
```

#### 영상 기획 모듈
```yaml
ai_generation_requested:
  description: "AI 4단계/12숏 생성 요청"
  properties:
    - generation_type: "4stages" | "12shots"
    - preset_used: string?
    - tone: string
    - genre: string
    
storyboard_generated:
  description: "콘티 이미지 생성 완료"
  properties:
    - shot_number: number
    - generation_time_ms: number
    - retry_count: number
    
pdf_exported:
  description: "PDF 기획안 내보내기"
  properties:
    - theme: "light" | "dark"
    - total_shots: number
    - file_size_kb: number
```

#### 영상 피드백 모듈
```yaml
comment_created:
  description: "타임코드 코멘트 작성"
  properties:
    - timecode_seconds: number
    - has_attachment: boolean
    - attachment_type: string?
    - auto_timecode_used: boolean
    
reaction_added:
  description: "코멘트 감정표현"
  properties:
    - reaction_type: "like" | "dislike" | "question"
    - comment_id: string
    - comment_author_id: string
    
feedback_resolved:
  description: "피드백 해결 처리"
  properties:
    - resolution_time_hours: number
    - reply_count: number
```

### 퍼널 추적

각 모듈의 핵심 사용자 여정을 퍼널로 추적:

#### 프로젝트 생성 퍼널
1. `dashboard_viewed` → 
2. `project_creation_started` → 
3. `project_creation_step_completed` (step: 1) → 
4. `project_creation_step_completed` (step: 2) → 
5. `project_creation_step_completed` (step: 3) → 
6. `project_created`

**목표 전환율**: Step 1→2 (90%), Step 2→3 (85%), Step 3→완료 (80%)

#### 피드백 협업 퍼널
1. `video_player_loaded` → 
2. `video_played` → 
3. `comment_creation_started` → 
4. `comment_created` → 
5. `feedback_resolved`

**목표 전환율**: 플레이→코멘트 작성 (40%), 코멘트→해결 (85%)

---

## VIII. 품질 게이트 및 테스트 전략

### Definition of Done (DoD)

각 모듈이 배포되기 전 다음 조건을 모두 만족해야 함:

#### 기능적 요구사항
- [ ] 모든 Gherkin 시나리오 E2E 테스트 통과
- [ ] API 에러 상황(4xx, 5xx) 적절한 UI 피드백
- [ ] 모든 상태(empty, loading, success, error) UI 구현
- [ ] 브라우저 뒤로가기/앞으로가기 정상 작동

#### 접근성 요구사항
- [ ] 키보드만으로 모든 기능 접근 가능
- [ ] WCAG 2.1 AA 자동 테스트 통과 (axe-core)
- [ ] 스크린 리더 수동 테스트 통과 (최소 1개)
- [ ] 색상 대비 4.5:1 이상 확인

#### 성능 요구사항
- [ ] Lighthouse 성능 점수 90 이상
- [ ] 첫 콘텐츠풀 페인트(FCP) 1.5초 이하
- [ ] 누적 레이아웃 변화(CLS) 0.1 이하
- [ ] 첫 입력 지연(FID) 100ms 이하

#### 브랜드/디자인 일관성
- [ ] 디자인 토큰만 사용, 하드코딩 없음
- [ ] 브랜드 색상(#0031ff, #1631f8) 올바른 적용
- [ ] 레거시 톤앤매너와 일관성 유지
- [ ] 반응형 디자인 (모바일~데스크톱) 검증

#### 개발자 경험
- [ ] TypeScript 타입 에러 0개
- [ ] ESLint 경고 0개 (FSD import 규칙 포함)
- [ ] 단위 테스트 커버리지 70% 이상
- [ ] 컴포넌트 Storybook 문서화

---

## IX. 마이크로카피 가이드라인

### 톤 앤 보이스

VRidge의 모든 텍스트는 다음 원칙을 따름:

- **전문적이면서도 친근함**: 비즈니스 도구이지만 딱딱하지 않음
- **명확하고 간결함**: 불필요한 수식어 배제
- **한국어 자연스러움**: 직역투 영어 표현 금지
- **긍정적 프레이밍**: 문제보다 해결책에 초점

### 공통 마이크로카피 사전

#### 액션 버튼
```yaml
Primary Actions:
  create: "만들기"
  save: "저장"
  submit: "제출"
  confirm: "확인"
  upload: "업로드"
  send: "보내기"
  export: "내보내기"

Secondary Actions:
  edit: "수정"
  delete: "삭제"
  cancel: "취소"
  retry: "다시 시도"
  refresh: "새로고침"
  copy: "복사"
  share: "공유"

Destructive Actions:
  delete_confirm: "정말 삭제하시겠습니까?"
  remove_member: "팀에서 제거"
  archive_project: "프로젝트 보관"
```

#### 상태 메시지
```yaml
Loading States:
  loading_general: "불러오는 중..."
  uploading: "업로드 중..."
  processing: "처리 중..."
  generating: "생성 중..."
  saving: "저장 중..."

Success States:
  saved: "저장되었습니다"
  uploaded: "업로드 완료"
  sent: "발송되었습니다"
  created: "생성되었습니다"
  updated: "업데이트되었습니다"

Error States:
  error_general: "문제가 발생했습니다"
  network_error: "연결을 확인해주세요"
  file_too_large: "파일 크기가 너무 큽니다"
  invalid_format: "지원하지 않는 형식입니다"
  permission_denied: "권한이 없습니다"
```

#### 빈 상태 메시지
```yaml
No Data:
  no_projects: "아직 프로젝트가 없습니다"
  no_comments: "첫 번째 코멘트를 남겨보세요"
  no_notifications: "새 알림이 없습니다"
  no_team_members: "팀원을 초대해보세요"
  no_schedule: "일정을 등록해보세요"

Call to Action:
  create_first_project: "첫 번째 프로젝트 만들기"
  add_team_member: "팀원 초대하기"
  upload_video: "비디오 업로드하기"
  start_planning: "기획 시작하기"
```

#### 검증 오류 메시지
```yaml
Required Fields:
  field_required: "필수 입력 항목입니다"
  email_required: "이메일 주소를 입력해주세요"
  title_required: "제목을 입력해주세요"

Format Errors:
  invalid_email: "올바른 이메일 형식이 아닙니다"
  password_too_short: "비밀번호는 8자 이상이어야 합니다"
  title_too_long: "제목은 50자를 초과할 수 없습니다"
  
Business Rules:
  duplicate_email: "이미 초대된 이메일입니다"
  insufficient_permission: "이 작업을 수행할 권한이 없습니다"
  schedule_conflict: "다른 일정과 겹칩니다"
```

### 시간 표현

모든 시간 관련 표시는 다음 규칙을 따름:

```yaml
Relative Time:
  just_now: "방금 전"
  minutes_ago: "{n}분 전"
  hours_ago: "{n}시간 전"
  days_ago: "{n}일 전"
  weeks_ago: "{n}주 전"

Absolute Time:
  date_format: "YYYY년 M월 D일"
  datetime_format: "YYYY년 M월 D일 HH:mm"
  timecode_format: "[MM:SS.mmm]"

Duration:
  seconds: "{n}초"
  minutes: "{n}분"
  hours: "{n}시간"
  days: "{n}일"
  weeks: "{n}주"
```

---

## X. 결론 및 다음 단계

### 핵심 성취 목표

이 UX 명세서를 통해 다음을 달성하고자 합니다:

1. **측정 가능한 사용자 경험**: 모든 기능에 KPI 연결
2. **접근성 우선 설계**: WCAG 2.1 AA 기준 100% 준수
3. **일관된 브랜드 경험**: 레거시 톤앤매너 완벽 보존
4. **테스트 가능한 명세**: 모든 요구사항을 Gherkin으로 검증
5. **FSD 아키텍처 정렬**: 각 기능이 올바른 레이어에 구현

### 구현 우선순위

**Phase 1: 기반 구축** (주 1-3)
- 대시보드 + 프로젝트 관리 모듈
- 공통 디자인 시스템 + 접근성 기준선

**Phase 2: 핵심 기능** (주 4-6)  
- 영상 피드백 + 캘린더 모듈
- E2E 테스트 커버리지 90% 달성

**Phase 3: 고급 기능** (주 7+)
- 영상 기획 AI 모듈
- 성능 최적화 + 품질 게이트 강화

### 품질 보장 프로세스

1. **개발 전**: Gherkin 시나리오 리뷰 및 승인
2. **개발 중**: 접근성 자동 테스트 + 디자인 QA
3. **개발 후**: E2E 테스트 + 성능 측정 + 사용성 테스트
4. **배포 후**: 실제 사용자 행동 분석 + 피드백 수집

### 성공 지표

- **Task Success Rate**: 주요 플로우 95% 이상 성공률
- **Time to Task**: 평균 작업 완료 시간 30% 단축
- **Accessibility Score**: axe-core 점수 100점 유지
- **User Satisfaction**: NPS 점수 70 이상 달성

이 명세서는 살아있는 문서로, 사용자 피드백과 비즈니스 요구사항 변화에 따라 지속적으로 업데이트됩니다.

---

## XI. 레거시 디자인 시스템 통합 전략

### 11.1 레거시 톤앤매너 분석

#### 핵심 브랜드 아이덴티티 보존

**초미니멀 & 세련된 디자인 원칙**:
- **Primary Blue 계열**: #0031ff (메인), #0058da (그라데이션), #0059db (호버)
- **Typography 스케일**: 'suit' 폰트, H1 60px → Body 15-18px 모듈러 체계
- **Container 시스템**: 최대 1300px (hero), 400px (forms), 8px 그리드 베이스
- **그림자 시스템**: 16px 10px 16px rgba(0,0,0,0.1) (카드), 5px 5px 10px #e8e8e8 (호버)
- **Border Radius**: 30px (컨테이너), 20px (카드), 15px (버튼/입력)

#### 레거시 보존 필수 요소

```scss
// 레거시 핵심 값 - 절대 변경 금지
$legacy-primary-blue: #0031ff;
$legacy-gradient: linear-gradient(135deg, #0031ff 0%, #0058da 100%);
$legacy-card-shadow: 16px 10px 16px rgba(0, 0, 0, 0.1);
$legacy-hover-shadow: 5px 5px 10px #e8e8e8;
$legacy-container-radius: 30px;
$legacy-card-radius: 20px;
$legacy-button-radius: 15px;
$legacy-hero-font: 60px;
$legacy-container-max: 1300px;
```

### 11.2 Tailwind CSS v4 매핑 전략

#### 레거시 SCSS → Tailwind 변환 매트릭스

```javascript
// tailwind.config.js - 레거시 완전 호환 설정
export default {
  theme: {
    extend: {
      colors: {
        // 레거시 Primary Blue 완전 매핑
        'vridge': {
          50: '#f0f4ff',   // 초연한 배경
          100: '#e6ecff',  // 선택 상태
          500: '#0031ff',  // 메인 브랜드 (레거시 #0031ff)
          600: '#0058da',  // 호버/액티브 (레거시 #0058da)
          700: '#0059db',  // 프레스 상태 (레거시 #0059db)
          800: '#012fff',  // 다크 변형 (레거시 #012fff)
        },
        // 레거시 Neutral 완전 매핑
        'vridge-gray': {
          50: '#fcfcfc',   // 레거시 #fcfcfc
          100: '#f8f8f8',  // 레거시 #f8f8f8
          200: '#e6e6e6',  // 레거시 #e6e6e6
          300: '#e4e4e4',  // 레거시 #e4e4e4
          400: '#c1c1c1',  // 레거시 #c1c1c1
          500: '#919191',  // 레거시 #919191
          600: '#516e8b',  // 레거시 #516e8b
          700: '#25282f',  // 레거시 #25282f (다크)
          900: '#1a1a1a'   // 레거시 #1a1a1a
        },
        // 시맨틱 컬러 레거시 매핑
        'vridge-success': '#28a745',  // 레거시 #28a745
        'vridge-error': '#d93a3a',    // 레거시 #d93a3a
        'vridge-warning': '#ffc107',  // 레거시 #ffc107
        'vridge-accent': '#3dcdbf'    // 레거시 #3dcdbf
      },
      
      fontFamily: {
        'suit': ['suit', 'sans-serif'], // 레거시 'suit' 폰트
        'legacy': ['suit', 'sans-serif']
      },
      
      fontSize: {
        // 레거시 타이포그래피 스케일 완전 매핑
        'hero': ['60px', { lineHeight: '1.1' }],     // 레거시 60px H1
        'section': ['38px', { lineHeight: '1.2' }],   // 레거시 38px H2
        'subsection': ['24px', { lineHeight: '1.3' }], // 레거시 24px H3
        'body-large': ['18px', { lineHeight: '1.6' }], // 레거시 18px
        'legacy-large': ['21px', { lineHeight: '1.6' }], // 레거시 21px
      },
      
      borderRadius: {
        // 레거시 Border Radius 완전 매핑
        'legacy-sm': '15px',   // 버튼/입력 (레거시)
        'legacy-md': '20px',   // 카드 (레거시)
        'legacy-lg': '30px',   // 컨테이너 (레거시)
        'legacy-nav': '30px',  // 사이드바 우측 라운드
      },
      
      boxShadow: {
        // 레거시 그림자 완전 매핑
        'legacy-card': '16px 10px 16px rgba(0, 0, 0, 0.1)',
        'legacy-hover': '5px 5px 10px #e8e8e8',
        'legacy-sidebar': '16px 0px 16px rgba(0, 0, 0, 0.06)',
        'legacy-elevated': '16px 10px 16px rgba(0, 0, 0, 0.2)',
      },
      
      maxWidth: {
        // 레거시 Container 시스템
        'legacy-hero': '1300px',     // 히어로 섹션 (레거시)
        'legacy-standard': '1200px', // 표준 콘텐츠
        'legacy-form': '400px',      // 폼 (레거시)
        'legacy-narrow': '900px',    // 좁은 콘텐츠
      },
      
      spacing: {
        // 레거시 spacing 시스템 보존
        '15': '60px',   // 레거시 mt60 매핑
        '25': '100px',  // 레거시 mt100 매핑
        '37.5': '150px', // 레거시 mt150 매핑
        '50': '200px',  // 레거시 mt200 매핑
      }
    },
    
    // 레거시 브레이크포인트 완전 매핑
    screens: {
      'mobile': {'max': '1023px'},     // < 1024px (레거시 모바일)
      'tablet': {'min': '1024px', 'max': '1259px'}, // 1024-1259px
      'desktop': {'min': '1260px'},    // >= 1260px (레거시 데스크톱)
      'desktop-lg': {'min': '1500px'}, // >= 1500px (레거시 XL)
    }
  },
  
  plugins: [
    // 레거시 호환 유틸리티 생성
    function({ addUtilities }) {
      addUtilities({
        '.legacy-transition': {
          'transition': 'all 0.3s ease-in-out', // 레거시 표준 트랜지션
        },
        '.legacy-slide': {
          'transition': 'all 0.5s', // 레거시 슬라이딩 패널
        },
        '.legacy-container': {
          'max-width': '1300px',
          'margin': '0 auto',
          'padding': '0 30px',
        }
      })
    }
  ]
}
```

#### 컴포넌트별 스타일 매핑 예시

**레거시 Primary Button → Tailwind 변환**:

```jsx
// 레거시 SCSS
.primary-button {
  background: #0031ff;
  border-radius: 15px;
  height: 54px;
  font-size: 18px;
  color: white;
  transition: all 0.3s ease-in-out;
  
  &:hover {
    background: #0058da;
    box-shadow: 5px 5px 10px #e8e8e8;
  }
}

// Tailwind CSS v4 변환 (완전 호환)
<button className="
  bg-vridge-500 hover:bg-vridge-600 
  rounded-legacy-sm h-14 px-6 
  text-body-large font-semibold text-white 
  legacy-transition hover:shadow-legacy-hover
  focus:outline-none focus:ring-2 focus:ring-vridge-500 focus:ring-offset-2
">
  액션 버튼
</button>
```

**레거시 Card → Tailwind 변환**:

```jsx
// 레거시 SCSS
.card {
  background: #fff;
  border-radius: 20px;
  box-shadow: 16px 10px 16px rgba(0, 0, 0, 0.1);
  padding: 16px;
  transition: all 0.3s;
  
  &:hover {
    box-shadow: 16px 10px 16px rgba(0, 0, 0, 0.2);
  }
}

// Tailwind CSS v4 변환 (완전 호환)
<div className="
  bg-white rounded-legacy-md shadow-legacy-card p-4 
  legacy-transition hover:shadow-legacy-elevated
">
  카드 콘텐츠
</div>
```

### 11.3 FSD 레이어별 레거시 호환 전략

#### Shared Layer - 레거시 기본 컴포넌트

```typescript
// shared/ui/Button/Button.tsx - 레거시 완전 호환 버튼
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'legacy-cert' | 'legacy-ty01' | 'legacy-ty02';
  size: 'sm' | 'md' | 'lg' | 'legacy-54'; // 레거시 54px 높이 지원
  legacyStyle?: boolean; // 레거시 스타일 강제 적용
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant, size, legacyStyle = false, className, children, ...props 
}) => {
  const baseClasses = "inline-flex items-center justify-center font-semibold legacy-transition focus:ring-2";
  
  const variantClasses = {
    primary: "bg-vridge-500 hover:bg-vridge-600 text-white rounded-legacy-sm",
    secondary: "bg-vridge-gray-700 hover:bg-vridge-gray-800 text-white rounded-legacy-sm", 
    'legacy-cert': "bg-vridge-500/30 hover:bg-vridge-600 text-vridge-500 rounded-md",
    'legacy-ty01': "bg-vridge-500 hover:bg-vridge-600 text-white rounded-legacy-sm",
    'legacy-ty02': "bg-vridge-gray-700 hover:bg-vridge-gray-800 text-white rounded-legacy-sm"
  };
  
  const sizeClasses = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-4 text-base", 
    lg: "h-12 px-6 text-lg",
    'legacy-54': "h-14 px-6 text-body-large" // 레거시 54px 정확 매핑
  };
  
  const legacyEnhancements = legacyStyle ? "hover:shadow-legacy-hover" : "";
  
  return (
    <button 
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        legacyEnhancements,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
```

#### Entities Layer - 프로젝트 카드 레거시 호환

```typescript
// entities/Project/ui/ProjectCard.tsx
export const ProjectCard: React.FC<ProjectCardProps> = ({
  project, 
  showProgress = false, 
  legacyLayout = false, 
  variant = 'modern'
}) => {
  const containerClasses = cn(
    "bg-white legacy-transition",
    legacyLayout ? [
      "rounded-legacy-md shadow-legacy-card hover:shadow-legacy-elevated",
      "max-w-legacy-form mx-auto p-4"
    ] : [
      "rounded-xl shadow-sm hover:shadow-md",
      "p-6"
    ]
  );
  
  const titleClasses = cn(
    "font-semibold mb-2",
    legacyLayout ? "text-lg text-vridge-gray-700" : "text-xl text-gray-900"
  );
  
  return (
    <div className={containerClasses}>
      <h3 className={titleClasses}>
        {project.title}
      </h3>
      
      {showProgress && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-vridge-gray-500">
            <span>기획</span>
            <span>촬영</span>
            <span>편집</span>
          </div>
          <div className={cn(
            "h-2 rounded-full overflow-hidden",
            legacyLayout ? "bg-vridge-gray-100" : "bg-gray-100"
          )}>
            <div 
              className="h-full bg-vridge-500 legacy-transition"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
```

### 11.4 모듈별 레거시 통합 가이드

#### 대시보드 - 레거시 간트 요약 스타일

```jsx
// widgets/Dashboard/ui/GanttSummaryWidget.tsx
export const GanttSummaryWidget = () => {
  return (
    <div className="bg-white rounded-legacy-md shadow-legacy-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-section font-bold text-vridge-gray-700">
          편집 일정 요약
        </h2>
        <button className="text-sm text-vridge-500 hover:text-vridge-600 legacy-transition">
          전체 보기
        </button>
      </div>
      
      <div className="space-y-3">
        {projects.map((project) => (
          <div key={project.id} className="flex items-center space-x-3">
            {/* 프로젝트별 고유 색상 (12-16% 틴트) */}
            <div 
              className="w-4 h-4 rounded-sm flex-shrink-0"
              style={{ 
                backgroundColor: `hsl(${project.hue}, 14%, 88%)`,
                borderLeft: `3px solid hsl(${project.hue}, 100%, 50%)`
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-vridge-gray-700 truncate">
                {project.name}
              </p>
              {/* 레거시 스타일 진행률 바 */}
              <div className="flex items-center space-x-2 mt-1">
                <div className="flex-1 bg-vridge-gray-100 rounded-full h-1.5">
                  <div 
                    className="bg-vridge-500 h-1.5 rounded-full legacy-transition"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <span className="text-xs text-vridge-gray-500">
                  {project.progress}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

#### 캘린더 - 레거시 색상 시스템 통합

```jsx
// widgets/Calendar/ui/CalendarView.tsx
const ProjectLegend = ({ projects, conflictsOnly }) => {
  return (
    <div className="bg-white rounded-legacy-md shadow-legacy-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-vridge-gray-700">
          프로젝트 범례
        </h3>
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 text-sm">
            <input 
              type="checkbox" 
              checked={conflictsOnly}
              className="rounded border-vridge-gray-300 focus:ring-vridge-500"
            />
            <span className="text-vridge-gray-600">충돌만 보기</span>
          </label>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
        {projects.map((project) => (
          <div key={project.id} className="flex items-center space-x-2">
            {/* 레거시 색상 스와치 (12-16% 틴트) */}
            <div className="flex items-center space-x-1">
              <div 
                className="w-4 h-4 rounded-sm border"
                style={{ 
                  backgroundColor: `hsl(${project.hue}, 14%, 88%)`,
                  borderColor: `hsl(${project.hue}, 100%, 45%)`
                }}
              />
              <div 
                className="w-1 h-4 rounded-sm"
                style={{ backgroundColor: `hsl(${project.hue}, 100%, 50%)` }}
              />
            </div>
            <span className="text-sm text-vridge-gray-700 truncate">
              {project.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

#### 영상 피드백 - 좌우 분할 레거시 레이아웃

```jsx
// processes/VideoFeedback/ui/VideoFeedbackLayout.tsx
export const VideoFeedbackLayout = () => {
  return (
    <div className="h-screen flex flex-col lg:flex-row bg-vridge-gray-50">
      {/* 좌측: 비디오 플레이어 (레거시 스타일) */}
      <div className="lg:w-2/3 bg-white">
        <div className="p-4 border-b border-vridge-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-vridge-gray-700">
              {project.title}
            </h1>
            <div className="flex items-center space-x-2">
              {/* 레거시 버튼 스타일 */}
              <Button variant="legacy-ty02" size="sm">
                업로드
              </Button>
              <Button variant="legacy-ty02" size="sm">
                교체
              </Button>
              <Button variant="legacy-ty01" size="sm">
                현재 시점 코멘트
              </Button>
              <Button variant="legacy-ty02" size="sm">
                스크린샷
              </Button>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <VideoPlayer className="w-full rounded-legacy-sm overflow-hidden" />
        </div>
      </div>
      
      {/* 우측: 탭 시스템 (레거시 스타일) */}
      <div className="lg:w-1/3 bg-white border-l border-vridge-gray-200">
        <div className="border-b border-vridge-gray-200">
          <nav className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={cn(
                  "px-6 py-3 text-sm font-medium legacy-transition",
                  activeTab === tab.key ? [
                    "text-vridge-500 border-b-2 border-vridge-500",
                    "bg-vridge-50"
                  ] : [
                    "text-vridge-gray-600 hover:text-vridge-gray-800",
                    "hover:bg-vridge-gray-50"
                  ]
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="h-full overflow-y-auto">
          {activeTab === 'comments' && <CommentsTab />}
          {activeTab === 'team' && <TeamTab />}
          {activeTab === 'project_info' && <ProjectInfoTab />}
        </div>
      </div>
    </div>
  );
};
```

### 11.5 접근성 레거시 통합

#### 레거시 호환 포커스 스타일

```css
/* globals.css - 레거시 호환 포커스 링 */
@layer utilities {
  .legacy-focus {
    @apply focus:outline-none focus:ring-2 focus:ring-vridge-500 focus:ring-offset-2;
  }
  
  .legacy-focus-visible {
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vridge-500 focus-visible:ring-offset-2;
  }
  
  /* 레거시 호버 리프트 효과 */
  .legacy-hover-lift {
    @apply hover:transform hover:-translate-y-0.5 hover:shadow-legacy-hover legacy-transition;
  }
}
```

#### 레거시 ARIA 패턴 유지

```jsx
// 레거시 읽지 않음 배지 접근성
const UnreadBadge = ({ count, projectName }) => {
  return (
    <div 
      className="relative inline-flex items-center"
      role="status"
      aria-live="polite"
      aria-label={`${projectName}에 새로운 활동 ${count}개`}
    >
      <div className="bg-vridge-error text-white rounded-full min-w-[24px] h-6 flex items-center justify-center text-xs font-semibold legacy-transition">
        {count > 9 ? '9+' : count}
      </div>
      <span className="sr-only">
        {projectName}에 읽지 않은 알림 {count}개
      </span>
    </div>
  );
};
```

---

**문서 버전**: v2.0  
**최종 업데이트**: 2025-08-26  
**작성자**: Eleanor (UX Lead)  
**승인자**: VRidge Product Team

**주요 변경사항 v2.0**:
- 레거시 디자인 시스템 완전 통합 전략 추가
- Tailwind CSS v4 매핑 세부 가이드라인
- FSD 레이어별 레거시 호환 컴포넌트 예시
- 모듈별 레거시 스타일 적용 방안

---

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "VRidge 5개 핵심 모듈의 정보 아키텍처 정의", "status": "completed", "activeForm": "VRidge 5개 핵심 모듈의 정보 아키텍처 정의 완료"}, {"content": "모듈별 사용자 플로우 명세서 작성 (Gherkin 시나리오 포함)", "status": "in_progress", "activeForm": "모듈별 사용자 플로우 명세서 작성 중 (Gherkin 시나리오 포함)"}, {"content": "접근성 기준선 요구사항 정의", "status": "pending", "activeForm": "접근성 기준선 요구사항 정의 중"}, {"content": "컴포넌트 디자인 시스템 매핑", "status": "pending", "activeForm": "컴포넌트 디자인 시스템 매핑 중"}, {"content": "View-Model 상태 매트릭스 정의", "status": "pending", "activeForm": "View-Model 상태 매트릭스 정의 중"}]