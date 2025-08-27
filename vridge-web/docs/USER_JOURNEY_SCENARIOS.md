# VRidge 웹서비스 사용자 여정 시나리오

**Isabelle, Head of Product** | **배포 환경 기반 E2E 테스트 시나리오**  
**프론트엔드**: https://vridge-xyc331ybx-vlanets-projects.vercel.app  
**백엔드**: https://api.vlanet.net  
**버전**: 1.0 | **작성일**: 2025-08-27

---

## I. 프로젝트 개요

### 플랫폼 비전
VRidge는 비디오 제작 협업을 혁신하는 플랫폼으로, 실시간 피드백과 팀 협업 최적화를 통해 프로젝트 버전 관리를 효율화합니다.

### 핵심 기능 매트릭스

| 기능 분류 | 구현 상태 | E2E 테스트 우선순위 | URL/경로 |
|----------|----------|-------------------|---------|
| **인증 시스템** | ✅ 완료 | Critical | `/login`, `/signup`, `/reset-password` |
| **대시보드** | ✅ 완료 | High | `/dashboard` |
| **프로젝트 관리** | ✅ 기본 구현 | High | `/projects`, `/projects/create` |
| **캘린더 일정** | ✅ 기본 구현 | Medium | `/calendar` |
| **영상 피드백** | ✅ 위젯 구현 | High | `/feedback` |
| **콘텐츠 관리** | ✅ 기본 구현 | Low | `/content` |

### 기술 스택 & 테스트 환경
- **프론트엔드**: Next.js 15.5 (App Router), Tailwind CSS v4
- **아키텍처**: Feature-Sliced Design (FSD)
- **테스트**: E2E 테스트 대상 브라우저 - Chrome, Safari, Firefox
- **접근성**: WCAG 2.1 AA 준수

---

## II. 인증 플로우 시나리오 (Critical Path)

### Feature: 사용자 인증 시스템
```gherkin
Feature: 사용자 인증 및 세션 관리
  VRidge 플랫폼 접근을 위한 안전한 인증 시스템

  Background:
    Given 사용자가 VRidge 웹사이트에 접속한다
    And 브라우저가 쿠키를 지원한다
```

#### 1. 회원가입 플로우

```gherkin
  Scenario: 이메일을 통한 신규 회원가입
    Given 사용자가 "https://vridge-xyc331ybx-vlanets-projects.vercel.app" 에 접속한다
    When 메인 페이지의 "시작하기" 버튼을 클릭한다
    Then "/signup" 페이지로 리다이렉트된다
    And 페이지 제목이 "회원가입"으로 표시된다
    And 좌측에 VRidge 로고와 "비디오 리뷰의 새로운 시작" 슬로건이 보인다
    
    When 이름 입력 필드에 "김비디오"를 입력한다
    And 이메일 입력 필드에 "kim.video@example.com"을 입력한다
    And 비밀번호 입력 필드에 "SecurePass123!"를 입력한다
    And 비밀번호 확인 필드에 "SecurePass123!"를 입력한다
    And 이용약관 동의 체크박스를 선택한다
    And "회원가입" 버튼을 클릭한다
    
    Then 이메일 인증 요청 메시지가 표시된다
    And "kim.video@example.com으로 인증 메일을 발송했습니다" 알림이 나타난다
    And SendGrid를 통해 인증 이메일이 발송된다

  Scenario: 이메일 인증 완료 및 로그인
    Given 사용자가 회원가입을 완료하고 인증 이메일을 받았다
    When 이메일의 "계정 인증하기" 링크를 클릭한다
    Then "/login?verified=true" 페이지로 리다이렉트된다
    And "이메일 인증이 완료되었습니다" 성공 메시지가 표시된다
    
    When 이메일 필드에 "kim.video@example.com"을 입력한다
    And 비밀번호 필드에 "SecurePass123!"를 입력한다
    And "로그인" 버튼을 클릭한다
    
    Then 로그인이 성공한다
    And "/dashboard" 페이지로 리다이렉트된다
    And 사용자 세션이 생성된다
    And localStorage에 인증 토큰이 저장된다

  Scenario: 회원가입 입력 유효성 검사
    Given 사용자가 "/signup" 페이지에 있다
    When 이메일 필드에 "invalid-email"을 입력한다
    And 비밀번호 필드에 "weak"를 입력한다
    And "회원가입" 버튼을 클릭한다
    
    Then "올바른 이메일 주소를 입력해주세요" 오류가 표시된다
    And "비밀번호는 8자 이상이어야 합니다" 오류가 표시된다
    And 해당 입력 필드에 빨간색 테두리가 표시된다
    And 포커스가 첫 번째 오류 필드로 이동한다
    And "회원가입" 버튼이 비활성화된다

  Scenario: 소셜 로그인 옵션 확인 (미구현 상태)
    Given 사용자가 "/signup" 페이지에 있다
    Then Google 소셜 로그인 버튼이 표시된다
    And Kakao 소셜 로그인 버튼이 표시된다
    And Naver 소셜 로그인 버튼이 표시된다
    
    When Google 로그인 버튼을 클릭한다
    Then 콘솔에 "Google login" 메시지가 출력된다
    # TODO: 실제 OAuth 연동 구현 후 테스트 업데이트 필요
```

#### 2. 로그인 플로우

```gherkin
  Scenario: 기존 사용자 로그인 성공
    Given 사용자가 "/login" 페이지에 접속한다
    And 인증된 계정 "kim.video@example.com"이 존재한다
    
    When 이메일 필드에 "kim.video@example.com"을 입력한다
    And 비밀번호 필드에 "SecurePass123!"를 입력한다
    And "아이디 저장" 체크박스를 선택한다
    And "로그인" 버튼을 클릭한다
    
    Then 로그인이 성공한다
    And "/dashboard" 페이지로 리다이렉트된다
    And localStorage에 "rememberedEmail" 값이 저장된다
    And 상단 헤더에 사용자 이름이 표시된다
    And 세션 토큰이 생성되어 API 요청에 사용된다

  Scenario: 로그인 실패 - 잘못된 자격증명
    Given 사용자가 "/login" 페이지에 있다
    When 이메일 필드에 "wrong@example.com"을 입력한다
    And 비밀번호 필드에 "wrongpassword"를 입력한다
    And "로그인" 버튼을 클릭한다
    
    Then "로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요." 오류가 표시된다
    And 오류 메시지가 빨간색으로 표시된다
    And 입력 필드들이 오류 상태(aria-invalid="true")로 설정된다
    And 사용자는 "/login" 페이지에 머물러 있다

  Scenario: 저장된 이메일 자동 입력
    Given 사용자가 이전에 "아이디 저장"으로 로그인했다
    And localStorage에 "rememberedEmail"이 저장되어 있다
    
    When "/login" 페이지를 새로 방문한다
    Then 이메일 필드에 저장된 이메일이 자동 입력된다
    And "아이디 저장" 체크박스가 선택된 상태로 표시된다

  Scenario: 세션 만료 후 자동 로그아웃
    Given 사용자가 로그인된 상태로 "/dashboard"에 있다
    When 세션이 만료된다 (예: 24시간 경과)
    And 사용자가 API 요청을 하는 액션을 수행한다
    
    Then 401 Unauthorized 응답을 받는다
    And "세션이 만료되었습니다. 다시 로그인해주세요." 메시지가 표시된다
    And "/login" 페이지로 자동 리다이렉트된다
    And localStorage에서 인증 토큰이 제거된다
```

#### 3. 비밀번호 재설정 플로우

```gherkin
  Scenario: 비밀번호 재설정 요청
    Given 사용자가 "/login" 페이지에 있다
    When "비밀번호를 잊으셨나요?" 링크를 클릭한다
    Then "/reset-password" 페이지로 이동한다
    
    When 이메일 필드에 "kim.video@example.com"을 입력한다
    And "재설정 링크 발송" 버튼을 클릭한다
    
    Then "비밀번호 재설정 링크를 발송했습니다" 메시지가 표시된다
    And SendGrid를 통해 재설정 이메일이 발송된다
    And 버튼이 "재전송 (60초)" 상태로 변경된다
    And 60초 카운트다운이 시작된다

  Scenario: 비밀번호 재설정 완료
    Given 사용자가 재설정 이메일의 링크를 클릭했다
    When 새 비밀번호 입력 페이지가 로드된다
    
    Then "새 비밀번호" 입력 필드가 표시된다
    And "비밀번호 확인" 입력 필드가 표시된다
    
    When 새 비밀번호에 "NewSecure456!"을 입력한다
    And 비밀번호 확인에 "NewSecure456!"을 입력한다
    And "비밀번호 변경" 버튼을 클릭한다
    
    Then "비밀번호가 성공적으로 변경되었습니다" 메시지가 표시된다
    And "/login" 페이지로 리다이렉트된다
    And 변경된 비밀번호로 로그인이 가능하다
```

---

## III. 핵심 기능별 사용자 여정 시나리오

### Feature: 대시보드 - 프로젝트 현황 관리

```gherkin
Feature: 대시보드 프로젝트 현황 및 빠른 액션
  사용자의 모든 프로젝트 상태를 한눈에 파악하고 빠른 액션 수행

  Background:
    Given 사용자 "kim.video@example.com"이 로그인되어 있다
    And 3개의 프로젝트를 보유하고 있다:
      | 프로젝트명 | 상태 | 진행률 | 우선순위 | 팀원수 |
      | 브랜드 홍보영상 | shooting | 65% | high | 3 |
      | 제품 소개영상 | editing | 80% | medium | 2 |
      | 이벤트 영상 | planning | 25% | low | 4 |

  Scenario: 대시보드 첫 접속 시 전체 현황 로드
    When 사용자가 "/dashboard"에 접속한다
    
    Then 페이지 제목이 "대시보드"로 표시된다
    And 부제목 "프로젝트 현황을 한눈에 확인하세요"가 표시된다
    And 좌측에 SideBar가 300px 너비로 고정 표시된다
    And 메인 컨텐츠 영역이 "ml-[300px]" 클래스로 설정된다
    
    And "프로젝트 현황" 섹션에 샘플 프로젝트 카드가 표시된다
    And 프로젝트 카드에 "샘플 프로젝트" 제목이 보인다
    And 상태가 "촬영중"으로 표시된다
    And 진행률이 65% 프로그레스 바로 표시된다
    And 우선순위가 "높음"으로 표시된다
    And 팀원 수가 "3명"으로 표시된다
    
    And "최근 활동" 섹션이 2/3 컬럼으로 표시된다
    And "빠른 작업" 섹션이 1/3 컬럼으로 표시된다
    And 모든 컨텐츠가 3초 내에 로드된다

  Scenario: 빠른 작업 액션 수행
    Given 사용자가 대시보드에 있다
    When "빠른 작업" 섹션의 "새 프로젝트" 버튼을 클릭한다
    Then "/projects/create" 페이지로 이동한다
    
    When 브라우저 뒤로가기로 대시보드로 돌아온다
    And "빠른 작업" 섹션의 "피드백 확인" 버튼을 클릭한다
    Then "/feedback" 페이지로 이동한다

  Scenario: 프로젝트 상태 카드 상호작용
    Given 사용자가 대시보드에 있다
    When 프로젝트 상태 카드를 클릭한다
    Then 프로젝트 상세 페이지로 이동한다 (현재 미구현)
    # TODO: 프로젝트 상세 페이지 구현 후 경로 업데이트 필요
    
    When 프로젝트 카드 위에 마우스를 올린다
    Then 호버 효과가 적용된다 (shadow-md, 약간의 scale)
    And 커서가 pointer로 변경된다

  Scenario: 반응형 레이아웃 동작 확인
    Given 사용자가 데스크톱 화면(1280px 이상)에서 대시보드에 있다
    When 브라우저 창을 태블릿 크기(768px)로 조정한다
    Then 사이드바가 자동으로 축소되거나 숨겨진다
    And 메인 컨텐츠가 전체 너비로 확장된다
    And 그리드가 1열로 변경된다 (lg:grid-cols-3 → grid-cols-1)
    
    When 모바일 크기(375px)로 더 축소한다
    Then 모든 텍스트가 적절한 크기로 조정된다
    And 버튼들이 터치 친화적 크기를 유지한다
    And 스크롤 없이 주요 정보가 표시된다
```

### Feature: 프로젝트 관리 시스템

```gherkin
Feature: 프로젝트 생성 및 관리
  새 프로젝트 생성, 목록 조회, 필터링 등 프로젝트 생명주기 관리

  Background:
    Given 사용자가 로그인되어 있다
    And 프로젝트 관리 권한을 보유한다

  Scenario: 프로젝트 목록 페이지 접속 및 기본 표시
    When 사용자가 "/projects" 페이지에 접속한다
    
    Then 페이지 제목이 "프로젝트"로 표시된다
    And 부제목 "모든 프로젝트를 관리하세요"가 표시된다
    And 우상단에 "새 프로젝트 만들기" 버튼이 표시된다
    And 프로젝트 필터 컴포넌트가 표시된다
    And 프로젝트 목록 그리드가 표시된다

  Scenario: 새 프로젝트 생성 플로우
    Given 사용자가 "/projects" 페이지에 있다
    When "새 프로젝트 만들기" 버튼을 클릭한다
    Then "/projects/create" 페이지로 이동한다
    
    And 프로젝트 생성 폼이 표시된다
    # TODO: 프로젝트 생성 폼 세부 필드 구현 후 시나리오 확장 필요
    
    When 프로젝트 제목에 "신규 브랜드 영상"을 입력한다
    And 설명에 "Q4 브랜드 캠페인 영상 제작"을 입력한다
    And "프로젝트 생성" 버튼을 클릭한다
    
    Then 프로젝트가 성공적으로 생성된다
    And "프로젝트가 생성되었습니다" 성공 메시지가 표시된다
    And "/projects" 목록 페이지로 리다이렉트된다
    And 새로 생성된 프로젝트가 목록 최상단에 표시된다

  Scenario: 프로젝트 필터링 기능
    Given "/projects" 페이지에 다양한 상태의 프로젝트들이 있다
    When 상태 필터에서 "진행중"을 선택한다
    Then 진행중 상태인 프로젝트만 목록에 표시된다
    And URL이 "?status=in-progress"로 업데이트된다
    
    When 필터를 "전체"로 변경한다
    Then 모든 프로젝트가 다시 표시된다
    And URL에서 쿼리 파라미터가 제거된다

  Scenario: 프로젝트 목록 빈 상태 처리
    Given 사용자가 프로젝트를 보유하지 않은 신규 사용자다
    When "/projects" 페이지에 접속한다
    
    Then 빈 상태 일러스트가 표시된다
    And "아직 프로젝트가 없습니다" 메시지가 표시된다
    And "첫 번째 프로젝트를 만들어보세요" 설명이 표시된다
    And "새 프로젝트 만들기" CTA 버튼이 강조 표시된다
```

### Feature: 캘린더 일정 관리

```gherkin
Feature: 프로젝트 통합 캘린더 및 일정 관리
  모든 프로젝트의 기획-촬영-편집 일정을 통합 관리하며 충돌 감지

  Background:
    Given 사용자가 로그인되어 있다
    And 다음 프로젝트들이 존재한다:
      | 프로젝트 | 색상 | 기획 기간 | 촬영 날짜 | 편집 기간 |
      | Project Alpha | 파란색(240°) | 9/1-9/7 | 9/8 | 9/9-9/20 |
      | Project Beta | 초록색(120°) | 9/5-9/10 | 9/11 | 9/12-9/25 |

  Scenario: 캘린더 월간 뷰 기본 로드
    When 사용자가 "/calendar" 페이지에 접속한다
    
    Then 월간 뷰 캘린더가 기본으로 표시된다
    And 현재 월(2025년 9월)이 표시된다
    And 좌측/우측 화살표 네비게이션이 제공된다
    And 우상단에 "월간/주간" 뷰 토글이 있다
    And 색상 범례가 우상단에 고정 표시된다
    
    And Project Alpha의 일정들이 파란색 계열로 표시된다:
      | 9/1-9/7 | 기획 (12% 블루 틴트) |
      | 9/8 | 촬영 (파란색 좌측 보더) |
      | 9/9-9/20 | 편집 (16% 블루 틴트) |
    
    And Project Beta의 일정들이 초록색 계열로 표시된다:
      | 9/5-9/10 | 기획 (12% 그린 틴트) |
      | 9/11 | 촬영 (초록색 좌측 보더) |
      | 9/12-9/25 | 편집 (16% 그린 틴트) |

  Scenario: 일정 충돌 감지 및 시각적 표시
    Given 캘린더가 로드된 상태다
    When 관리자가 Project Beta 촬영을 9/8로 드래그 앤 드롭한다 (Project Alpha와 동일 날짜)
    
    Then 두 프로젝트의 9/8 촬영 일정 모두 충돌 표시된다:
      | 점선 테두리 (border-dashed) |
      | 경고 아이콘 표시 |
      | 옅은 사선 패턴 오버레이 |
    
    And 툴팁에 "Project Alpha와 촬영 일정 충돌" 메시지가 표시된다
    And 상단에 "일정 충돌이 감지되었습니다" 알림이 나타난다

  Scenario: 충돌 필터 기능 사용
    Given 캘린더에 충돌 일정이 존재한다
    When 우상단의 "충돌만 보기" 체크박스를 활성화한다
    
    Then 충돌하는 일정만 표시된다
    And 충돌하지 않는 일정들은 숨겨진다 (display: none)
    And 페이지 제목이 "충돌 일정 (2개)"로 업데이트된다
    
    When 체크박스를 다시 비활성화한다
    Then 모든 일정이 다시 표시된다
    And 제목이 원래대로 복원된다

  Scenario: 프로젝트별 색상 범례 상호작용
    Given 캘린더에 여러 프로젝트 일정이 표시된다
    When 범례에서 "Project Alpha" 색상칩을 클릭한다
    
    Then Project Alpha 관련 일정만 하이라이트된다
    And 다른 프로젝트 일정들은 50% 투명도로 표시된다
    And 선택된 프로젝트 칩에 선택 표시가 나타난다
    
    When 다른 빈 영역을 클릭한다
    Then 모든 일정이 원래 투명도로 복원된다

  Scenario: 주간 뷰 전환 및 세부 정보 표시
    Given 사용자가 월간 뷰에 있다
    When "주간" 뷰 토글을 클릭한다
    
    Then 주간 뷰로 전환된다
    And 현재 주(9/1-9/7)가 표시된다
    And 시간별 세부 일정이 표시된다 (시간 정보가 있는 경우)
    And 일정 블록이 더 상세한 정보를 표시한다

  Scenario: 키보드 네비게이션 접근성
    Given 사용자가 캘린더에 키보드로 접근한다
    When Tab 키를 눌러 네비게이션한다
    
    Then 포커스가 다음 순서로 이동한다:
      | 좌측 화살표 → 우측 화살표 → 뷰 토글 → 충돌 필터 → 범례 → 일정 블록들 |
    
    When 일정 블록에 포커스된 상태에서 Enter를 누른다
    Then 해당 일정의 상세 정보가 표시된다
    
    When 화살표 키를 사용한다
    Then 날짜 간 포커스 이동이 가능하다
```

### Feature: 영상 피드백 시스템

```gherkin
Feature: 실시간 영상 피드백 및 협업
  타임스탬프 기반 댓글, 영상 재생 제어, 팀 협업 기능

  Background:
    Given 사용자가 로그인되어 있다
    And 편집자 권한을 보유한다
    And "브랜드 홍보영상" 프로젝트에 접근 권한이 있다
    And 프로젝트에 "sample-video.mp4" 파일이 업로드되어 있다

  Scenario: 피드백 페이지 초기 로드 및 레이아웃
    When 사용자가 "/feedback" 페이지에 접속한다
    
    Then 비디오 플레이어가 좌측 영역에 로드된다
    And HTML5 비디오 플레이어가 어두운 테마로 표시된다
    And 비디오 제어 컨트롤바가 하단에 표시된다:
      | 재생/일시정지 버튼 | 진행률 바 | 시간 표시 | 볼륨 | 전체화면 | 속도 조절 |
    
    And 우측에 탭 시스템이 표시된다:
      | "코멘트" 탭 (기본 선택) |
      | "팀원" 탭 |
      | "프로젝트 정보" 탭 |
    
    And 타임라인 기반 댓글 영역이 비디오 하단에 표시된다
    And 페이지가 어두운 테마(dark mode)로 설정된다

  Scenario: 타임스탬프 자동 반영 댓글 작성
    Given 사용자가 피드백 페이지에 있다
    And 비디오가 01:23 지점에서 일시정지되어 있다
    
    When 댓글 입력 필드를 클릭한다
    Then 타임스탬프 "[01:23]"이 자동으로 입력 필드에 삽입된다
    And 커서가 타임스탬프 다음 위치에 있다
    
    When "이 부분의 음성이 너무 작은 것 같습니다."를 입력한다
    And 우선순위를 "높음"으로 설정한다
    And "댓글 작성" 버튼을 클릭한다
    
    Then 댓글이 타임라인에 빨간색 마커로 표시된다
    And 댓글 목록에 "[01:23] 이 부분의 음성이 너무 작은 것 같습니다."가 추가된다
    And 작성 시간과 작성자 정보가 함께 표시된다

  Scenario: 비디오 영역 클릭으로 좌표 기반 댓글 생성
    Given 사용자가 비디오를 02:15 지점에서 시청 중이다
    When 비디오 화면의 우상단 영역(x: 80%, y: 20%)을 클릭한다
    
    Then 해당 좌표에 빨간색 핀 마커가 표시된다
    And 댓글 작성 모달이 표시된다
    And 타임스탬프 "[02:15]"가 자동 입력된다
    And 좌표 정보 "(우상단)"가 메타데이터로 저장된다
    
    When "로고 위치를 조금 더 왼쪽으로 이동해주세요"를 입력한다
    And "저장" 버튼을 클릭한다
    
    Then 비디오에 좌표 마커가 유지된다
    And 타임라인에 해당 시점 마커가 추가된다
    And 02:15 지점 재생 시 좌표 마커가 나타난다

  Scenario: 비디오 재생 컨트롤 및 키보드 단축키
    Given 사용자가 비디오 플레이어에 포커스를 맞춘 상태다
    When 스페이스바를 누른다
    Then 비디오가 재생/일시정지된다
    And aria-label이 "재생 중" 또는 "일시정지됨"으로 업데이트된다
    
    When 좌측 화살표 키를 누른다
    Then 비디오가 5초 뒤로 이동한다
    And 현재 시간이 화면에 표시된다
    
    When 우측 화살표 키를 누른다
    Then 비디오가 5초 앞으로 이동한다
    
    When 숫자 키 "1"을 누른다
    Then 재생 속도가 0.5배속으로 변경된다
    When 숫자 키 "2"를 누른다
    Then 재생 속도가 정상(1배속)으로 변경된다

  Scenario: 댓글 스레드 및 반응 시스템
    Given 기존 댓글 "[01:23] 음성이 작습니다"가 존재한다
    When 해당 댓글의 "답글" 버튼을 클릭한다
    
    Then 대댓글 입력 필드가 나타난다
    And 원 댓글 아래 들여쓰기되어 표시된다
    
    When "네, 다음 버전에서 음성 볼륨을 높이겠습니다."를 입력한다
    And "답글 작성" 버튼을 클릭한다
    
    Then 대댓글이 스레드 형태로 표시된다
    And 원 댓글 작성자에게 알림이 발송된다
    
    When 다른 사용자가 원 댓글의 "좋아요" 버튼을 클릭한다
    Then 좋아요 수가 1 증가한다
    And 반응한 사용자 아바타가 표시된다
    And 툴팁에 "김에디터님이 좋아요를 눌렀습니다" 정보가 표시된다

  Scenario: 팀원 초대 및 권한 관리
    Given 사용자가 "팀원" 탭에 있다
    When "팀원 초대" 버튼을 클릭한다
    
    Then 이메일 입력 필드가 표시된다
    And 역할 선택 드롭다운이 표시된다: [Owner, Admin, Editor, Reviewer, Viewer]
    
    When 이메일에 "new.member@example.com"을 입력한다
    And 역할을 "Reviewer"로 선택한다
    And "초대 발송" 버튼을 클릭한다
    
    Then SendGrid를 통해 초대 이메일이 발송된다
    And 팀원 목록에 "초대 전송됨" 상태로 추가된다
    And 재전송 쿨다운 타이머(60초)가 시작된다
    
    When 60초 후 "재전송" 버튼을 클릭한다
    Then 초대 이메일이 다시 발송된다

  Scenario: 프로젝트 공유 링크 및 보안 설정
    Given 사용자가 "프로젝트 정보" 탭에 있다
    When "외부 공유" 토글을 활성화한다
    
    Then 공유 링크가 생성된다: "https://vridge.com/shared/abc123"
    And 링크 복사 버튼이 활성화된다
    And 만료일 설정 옵션이 표시된다: [7일, 30일, 무제한]
    
    When 만료일을 "7일"로 설정한다
    And 비밀번호 보호를 활성화한다
    And 비밀번호 "SecurePass123"을 설정한다
    And "설정 저장" 버튼을 클릭한다
    
    Then "공유 설정이 저장되었습니다" 메시지가 표시된다
    And 7일 후 자동 만료 예정 안내가 표시된다
```

---

## IV. 보조 기능 및 팀 협업 시나리오

### Feature: 네비게이션 및 사이드바

```gherkin
Feature: 사이드바 네비게이션 시스템
  모든 페이지에서 일관된 네비게이션 경험 제공

  Background:
    Given 사용자가 로그인되어 있다
    And 대시보드 페이지에 접속한 상태다

  Scenario: 사이드바 기본 표시 및 구조
    Then 좌측에 고정 사이드바가 300px 너비로 표시된다
    And VRidge 로고가 상단에 표시된다
    And 다음 메뉴 항목들이 순서대로 표시된다:
      | 홈 (대시보드) - 활성 상태 |
      | 프로젝트 |
      | 캘린더 |
      | 피드백 |
      | 콘텐츠 |
    
    And 하단에 사용자 프로필 영역이 표시된다
    And 각 메뉴 항목에 적절한 아이콘이 표시된다

  Scenario: 메뉴 네비게이션 및 활성 상태 표시
    When "프로젝트" 메뉴 항목을 클릭한다
    Then "/projects" 페이지로 이동한다
    And "프로젝트" 항목이 활성 상태로 표시된다
    And 이전 활성 항목("홈")은 비활성 상태로 변경된다
    And 활성 항목에 하이라이트 배경색이 적용된다

  Scenario: 사이드바 반응형 동작
    Given 사용자가 데스크톱 화면(1280px)에서 작업 중이다
    When 브라우저 창을 태블릿 크기(768px)로 축소한다
    Then 사이드바가 축소된다 (아이콘만 표시)
    And 메인 컨텐츠 영역이 확장된다
    
    When 모바일 크기(375px)로 더 축소한다
    Then 사이드바가 완전히 숨겨진다
    And 햄버거 메뉴 버튼이 상단에 나타난다
    
    When 햄버거 메뉴를 클릭한다
    Then 모바일 전용 드로어 메뉴가 좌측에서 슬라이드인된다
    And 배경 오버레이가 표시된다
    
    When 오버레이를 클릭한다
    Then 드로어 메뉴가 닫힌다

  Scenario: 키보드 네비게이션 접근성
    Given 사용자가 키보드로 네비게이션한다
    When Tab 키를 누른다
    Then 포커스가 첫 번째 메뉴 항목으로 이동한다
    
    When 화살표 아래 키를 누른다
    Then 포커스가 다음 메뉴 항목으로 이동한다
    
    When Enter 키를 누른다
    Then 해당 페이지로 이동한다
    And 포커스 표시가 명확하게 보인다 (아웃라인)
```

### Feature: 알림 및 피드백 시스템

```gherkin
Feature: 시스템 알림 및 사용자 피드백
  Toast 메시지, 에러 상태, 로딩 상태 등 사용자 경험 향상

  Background:
    Given 사용자가 로그인되어 있다

  Scenario: 성공/오류 Toast 메시지 표시
    When 사용자가 프로젝트 생성을 완료한다
    Then 우상단에 성공 Toast가 3초간 표시된다:
      | 초록색 배경 |
      | "프로젝트가 성공적으로 생성되었습니다" 메시지 |
      | 체크 아이콘 |
      | 닫기(X) 버튼 |
    
    When 네트워크 오류가 발생한다
    Then 빨간색 오류 Toast가 5초간 표시된다:
      | "연결에 문제가 발생했습니다. 다시 시도해주세요." 메시지 |
      | 경고 아이콘 |
      | "다시 시도" 액션 버튼 |

  Scenario: 로딩 상태 표시 시스템
    When 사용자가 대용량 비디오를 업로드한다
    Then 로딩 스피너가 업로드 영역에 표시된다
    And "업로드 중... 45%" 진행률이 표시된다
    And 모든 관련 버튼이 비활성화된다
    
    When 업로드가 완료된다
    Then 로딩 상태가 제거된다
    And 성공 메시지가 표시된다
    And 관련 버튼들이 다시 활성화된다

  Scenario: 확인 모달 및 위험한 액션 처리
    When 사용자가 프로젝트 삭제 버튼을 클릭한다
    Then 확인 모달이 센터에 표시된다:
      | "정말로 삭제하시겠습니까?" 제목 |
      | "이 작업은 되돌릴 수 없습니다" 설명 |
      | "취소" 버튼 (회색) |
      | "삭제" 버튼 (빨간색) |
    
    And 모달 외부 영역이 어둡게 오버레이된다
    And 포커스가 모달 내부로 트랩된다
    
    When "삭제" 버튼을 클릭한다
    Then 삭제가 실행된다
    And "프로젝트가 삭제되었습니다" 확인 메시지가 표시된다
    
    When ESC 키를 누른다
    Then 모달이 닫힌다
    And 삭제가 취소된다

  Scenario: 실시간 협업 알림
    Given 사용자가 피드백 페이지에서 작업 중이다
    When 다른 팀원이 새 댓글을 작성한다
    Then 우상단에 실시간 알림이 표시된다:
      | "김에디터님이 새 댓글을 작성했습니다" |
      | 해당 댓글로 이동하는 링크 |
    
    When 알림을 클릭한다
    Then 새 댓글 위치로 스크롤된다
    And 해당 댓글이 하이라이트된다 (노란색 배경)
```

---

## V. 에러 상태 및 예외 처리 시나리오

### Feature: 네트워크 오류 및 복구

```gherkin
Feature: 네트워크 연결 오류 처리
  오프라인 상황, API 오류, 서버 점검 등 예외 상황 대응

  Scenario: 네트워크 연결 끊김 감지
    Given 사용자가 대시보드에서 작업 중이다
    When 인터넷 연결이 끊어진다
    And 사용자가 새 프로젝트 생성을 시도한다
    
    Then 네트워크 오류 Toast가 표시된다:
      | "인터넷 연결을 확인해주세요" |
      | 오프라인 아이콘 |
      | "연결 확인" 버튼 |
    
    And 상단에 오프라인 상태 배너가 표시된다
    And 데이터 변경 액션들이 비활성화된다

  Scenario: API 서버 오류 (5xx) 처리
    Given 사용자가 프로젝트 생성을 시도한다
    When 백엔드 서버에서 500 Internal Server Error가 발생한다
    
    Then "서버에 일시적인 문제가 발생했습니다" 오류 메시지가 표시된다
    And "잠시 후 다시 시도해주세요" 안내가 제공된다
    And "다시 시도" 버튼이 제공된다
    And 입력한 데이터는 보존된다
    
    When 사용자가 "다시 시도"를 클릭한다
    Then 같은 데이터로 재시도한다

  Scenario: 인증 토큰 만료 처리
    Given 사용자가 로그인된 상태로 장시간 작업한다
    When 세션 토큰이 만료된다
    And API 요청 시 401 Unauthorized를 받는다
    
    Then "로그인이 만료되었습니다" 모달이 표시된다
    And "다시 로그인하기" 버튼이 제공된다
    And 현재 작업 내용이 임시 저장된다
    
    When "다시 로그인하기"를 클릭한다
    Then "/login" 페이지로 이동한다
    And 로그인 후 원래 페이지로 리다이렉트된다
    And 임시 저장된 내용이 복원된다

  Scenario: 파일 업로드 실패 처리
    Given 사용자가 대용량 비디오 파일을 업로드한다
    When 업로드 중 네트워크 오류가 발생한다
    
    Then 업로드 진행률이 중단된다
    And "업로드 실패: 연결이 중단되었습니다" 오류가 표시된다
    And "재시도" 및 "취소" 옵션이 제공된다
    
    When 사용자가 "재시도"를 선택한다
    Then 업로드가 중단된 지점부터 재개된다 (chunked upload)
    And 진행률 표시가 업데이트된다
```

### Feature: 브라우저 호환성 및 기능 감지

```gherkin
Feature: 브라우저 지원 및 Fallback 처리
  구형 브라우저, 기능 미지원 상황 대응

  Scenario: 구형 브라우저 접속 감지
    Given 사용자가 Internet Explorer 11로 접속한다
    When 웹사이트에 접근한다
    
    Then 브라우저 업그레이드 안내 페이지가 표시된다:
      | "지원되지 않는 브라우저입니다" 제목 |
      | 권장 브라우저 목록 (Chrome, Firefox, Safari, Edge) |
      | 다운로드 링크 제공 |
    
    And 핵심 기능들이 제한된다
    And 기본적인 읽기 기능만 제공된다

  Scenario: JavaScript 비활성화 상태 처리
    Given 사용자 브라우저에서 JavaScript가 비활성화되어 있다
    When 웹사이트에 접속한다
    
    Then <noscript> 태그 내용이 표시된다:
      | "JavaScript를 활성화해주세요" 메시지 |
      | 활성화 방법 안내 링크 |
    
    And 기본적인 정적 콘텐츠만 표시된다
    And 인터랙티브 기능들이 작동하지 않는다

  Scenario: 로컬 스토리지 미지원 Fallback
    Given 브라우저가 localStorage를 지원하지 않는다
    When 사용자가 "아이디 저장" 기능을 사용한다
    
    Then 쿠키를 이용한 대체 저장이 실행된다
    And 기능은 정상적으로 작동한다
    And 사용자에게는 차이가 없다

  Scenario: 웹캠/마이크 권한 거부 처리
    Given 화상회의 기능이 구현된 상황에서
    When 사용자가 브라우저 권한 요청을 거부한다
    
    Then "카메라/마이크 접근이 거부되었습니다" 안내가 표시된다
    And 권한 설정 방법이 안내된다
    And 대체 기능(화면 공유, 채팅)이 제공된다
```

---

## VI. 성능 및 접근성 테스트 시나리오

### Feature: 페이지 로딩 성능

```gherkin
Feature: 웹사이트 성능 최적화 검증
  Core Web Vitals 및 사용자 경험 성능 지표 측정

  Scenario: 초기 페이지 로딩 성능 측정
    When 사용자가 메인 페이지에 최초 접속한다
    
    Then First Contentful Paint(FCP)가 1.8초 이내에 발생한다
    And Largest Contentful Paint(LCP)가 2.5초 이내에 발생한다
    And Cumulative Layout Shift(CLS)가 0.1 이하를 유지한다
    And 메인 콘텐츠가 3초 내에 인터랙션 가능하다

  Scenario: 대시보드 데이터 로딩 성능
    Given 사용자가 로그인된 상태다
    When "/dashboard" 페이지로 이동한다
    
    Then 스켈레톤 UI가 즉시 표시된다 (0.1초 이내)
    And 프로젝트 현황 데이터가 1초 이내에 로드된다
    And 최근 활동 피드가 2초 이내에 표시된다
    And 모든 인터랙티브 요소가 3초 이내에 준비된다

  Scenario: 비디오 스트리밍 성능
    Given 사용자가 피드백 페이지에 접속한다
    When 비디오 파일 로딩을 시작한다
    
    Then 비디오 포스터가 즉시 표시된다
    And 첫 5초분 버퍼링이 3초 이내에 완료된다
    And 재생 시작 지연이 1초 이내다
    And 버퍼링 중단 없이 연속 재생이 가능하다

  Scenario: 모바일 성능 최적화
    Given 사용자가 모바일 디바이스(3G 연결)로 접속한다
    When 모든 페이지를 순서대로 방문한다
    
    Then 각 페이지 로딩이 5초 이내에 완료된다
    And 이미지들이 적절히 압축되어 제공된다 (WebP format)
    And 스크롤 성능이 60fps를 유지한다
    And 터치 인터랙션 지연이 100ms 이내다
```

### Feature: 웹 접근성 (WCAG 2.1 AA) 준수

```gherkin
Feature: 웹 접근성 표준 준수 검증
  장애인 사용자와 보조 기술 사용자를 위한 접근성 보장

  Background:
    Given 스크린 리더(NVDA/JAWS)가 활성화된 환경이다

  Scenario: 키보드 네비게이션 완전 지원
    Given 사용자가 마우스 없이 키보드만 사용한다
    When Tab 키로 모든 페이지 요소를 탐색한다
    
    Then 모든 인터랙티브 요소에 Tab으로 접근 가능하다
    And 포커스 순서가 논리적이고 예측 가능하다
    And 포커스 표시가 명확하게 보인다 (최소 2px 아웃라인)
    And 포커스 트랩이 모달에서 올바르게 작동한다
    
    When Enter/Space 키로 버튼들을 활성화한다
    Then 모든 버튼이 키보드로 작동한다
    
    When 화살표 키를 사용한다
    Then 메뉴, 탭, 캘린더에서 화살표 네비게이션이 작동한다

  Scenario: 스크린 리더 호환성
    Given 사용자가 스크린 리더를 사용한다
    When 각 페이지를 방문한다
    
    Then 모든 이미지에 적절한 alt 텍스트가 있다
    And 모든 폼 요소에 연결된 레이블이 있다
    And 링크 텍스트가 목적을 명확히 설명한다
    And 헤딩 구조(h1-h6)가 논리적으로 구성되어 있다
    
    When 동적 콘텐츠가 업데이트된다
    Then aria-live 영역이 변경사항을 공지한다
    
    When 에러가 발생한다
    Then role="alert"으로 즉시 공지된다

  Scenario: 색상 및 대비 접근성
    Given 사용자가 색각 이상(색맹)을 가지고 있다
    When 모든 UI 요소를 확인한다
    
    Then 정보가 색상에만 의존하지 않는다 (아이콘, 패턴 병용)
    And 모든 텍스트가 4.5:1 이상의 대비율을 유지한다
    And 활성/비활성 상태가 색상 외 방법으로도 구분된다
    
    When 고대비 모드를 활성화한다
    Then 모든 콘텐츠가 여전히 읽기 가능하다

  Scenario: 움직임 및 애니메이션 제어
    Given 사용자가 전정 장애로 움직임에 민감하다
    When 시스템에 "prefers-reduced-motion" 설정을 활성화한다
    
    Then 자동 재생 애니메이션이 중단된다
    And 패럴랙스 효과가 비활성화된다
    And 필수적이지 않은 움직임이 제거된다
    And 사용자가 움직임을 수동으로 제어할 수 있다

  Scenario: 폼 접근성 및 오류 처리
    Given 사용자가 로그인 폼에서 오류를 발생시킨다
    When 잘못된 정보를 입력하고 제출한다
    
    Then 오류 메시지가 폼 상단에 요약 표시된다
    And 각 오류 필드에 aria-describedby가 연결된다
    And 오류 메시지가 구체적이고 해결 방법을 제시한다
    And 첫 번째 오류 필드로 포커스가 이동한다
    
    When 오류를 수정한다
    Then 실시간으로 유효성 상태가 업데이트된다
    And aria-invalid 값이 동적으로 변경된다
```

---

## VII. 크로스 브라우저 및 디바이스 테스트 매트릭스

### Browser Compatibility Matrix

| 기능 분류 | Chrome 120+ | Firefox 120+ | Safari 17+ | Edge 120+ | 모바일 Safari | Chrome Mobile |
|----------|-------------|--------------|------------|-----------|---------------|---------------|
| 인증 시스템 | ✅ 필수 | ✅ 필수 | ✅ 필수 | ✅ 필수 | ✅ 필수 | ✅ 필수 |
| 비디오 재생 | ✅ H.264/WebM | ✅ H.264/WebM | ✅ H.264 | ✅ H.264/WebM | ✅ H.264 | ✅ H.264/WebM |
| 파일 업로드 | ✅ Drag&Drop | ✅ Drag&Drop | ⚠️ 제한적 | ✅ Drag&Drop | ❌ Click만 | ⚠️ 제한적 |
| 로컬 스토리지 | ✅ 완전 지원 | ✅ 완전 지원 | ✅ 완전 지원 | ✅ 완전 지원 | ✅ 완전 지원 | ✅ 완전 지원 |
| CSS Grid/Flexbox | ✅ 완전 지원 | ✅ 완전 지원 | ✅ 완전 지원 | ✅ 완전 지원 | ✅ 완전 지원 | ✅ 완전 지원 |

### Device & Viewport Testing

```gherkin
Feature: 반응형 디자인 다중 디바이스 테스트
  다양한 화면 크기와 입력 방식에서 일관된 경험 제공

  Scenario Outline: 다양한 디바이스에서 레이아웃 적응
    Given 사용자가 <device> 디바이스를 사용한다
    When 모든 주요 페이지를 방문한다
    
    Then 콘텐츠가 <viewport> 크기에 맞게 조정된다
    And 텍스트가 읽기 가능한 크기로 표시된다 (최소 16px)
    And 터치 타겟이 44px 이상 크기를 유지한다
    And 가로/세로 스크롤이 적절히 처리된다
    
    Examples:
      | device | viewport |
      | iPhone 14 Pro | 393x852 |
      | Galaxy S23 | 360x780 |
      | iPad Air | 820x1180 |
      | MacBook Air 13" | 1280x800 |
      | 4K Desktop | 2560x1440 |

  Scenario: 터치 인터랙션 최적화
    Given 사용자가 터치 디바이스를 사용한다
    When 모든 인터랙티브 요소를 터치한다
    
    Then 터치 영역이 충분히 크다 (최소 44x44px)
    And 터치 피드백이 즉시 제공된다
    And 스와이프 제스처가 지원된다 (해당하는 경우)
    And 핀치 줌이 적절히 제어된다

  Scenario: 가로/세로 화면 회전 대응
    Given 사용자가 모바일 디바이스를 사용한다
    When 화면을 세로에서 가로로 회전한다
    
    Then 레이아웃이 즉시 적응한다
    And 현재 작업 상태가 보존된다
    And 비디오 플레이어가 전체 화면 모드로 최적화된다
    And 키보드 입력 시 레이아웃이 적절히 조정된다
```

---

## VIII. 종합 테스트 실행 체크리스트

### Critical Path 우선순위 (반드시 통과해야 하는 시나리오)

```yaml
Priority: CRITICAL (P0)
- 로그인/로그아웃 플로우
- 회원가입 및 이메일 인증
- 대시보드 기본 표시
- 프로젝트 생성
- 비디오 업로드 및 재생
- 댓글 작성 및 표시
- 모바일 기본 기능 (iPhone, Android)

Priority: HIGH (P1)
- 비밀번호 재설정
- 프로젝트 목록 필터링
- 캘린더 월간/주간 뷰
- 팀원 초대
- 파일 업로드/다운로드
- 실시간 알림
- 접근성 키보드 네비게이션

Priority: MEDIUM (P2)
- 소셜 로그인 (구현 완료 후)
- 캘린더 일정 충돌 감지
- 비디오 좌표 기반 댓글
- 고급 필터링
- 다크 모드
- 다국어 지원 (구현 시)

Priority: LOW (P3)
- 성능 최적화 세부사항
- 애니메이션 및 전환 효과
- 고급 접근성 기능
- 구형 브라우저 지원
```

### 자동화 vs 수동 테스트 분류

```yaml
자동화 테스트 (E2E):
- 로그인/로그아웃 플로우
- 페이지 이동 및 네비게이션
- 폼 제출 및 유효성 검사
- API 응답 처리
- 기본적인 UI 인터랙션

수동 테스트 필요:
- 비디오 재생 품질
- 복잡한 드래그앤드롭
- 파일 업로드 진행률
- 실시간 협업 기능
- 접근성 스크린 리더 테스트
- 크로스 브라우저 세부 차이점
```

---

## IX. 배포 전 최종 검증 체크리스트

### 프로덕션 환경 검증

```gherkin
Feature: 배포 환경 최종 검증
  실제 배포 URL에서 모든 기능이 정상 작동함을 확인

  Scenario: 프로덕션 URL 및 API 연결 확인
    Given 프로덕션 환경이 배포되어 있다
    When "https://vridge-xyc331ybx-vlanets-projects.vercel.app"에 접속한다
    Then 메인 페이지가 정상 로드된다
    And "https://api.vlanet.net" API 서버와 연결된다
    And HTTPS 인증서가 유효하다
    And 모든 정적 자원(이미지, CSS, JS)이 정상 로드된다

  Scenario: 환경별 설정 확인
    Given 프로덕션 환경에 접속한다
    Then 개발용 디버그 정보가 표시되지 않는다
    And console.log가 프로덕션에서 제거되었다
    And 에러 메시지가 사용자 친화적으로 표시된다
    And API 키가 환경 변수로 적절히 관리된다

  Scenario: 보안 검증
    Then CSP(Content Security Policy) 헤더가 설정되어 있다
    And XSS 보호 헤더가 적용되어 있다
    And CORS 정책이 올바르게 설정되어 있다
    And 민감한 정보가 클라이언트에 노출되지 않는다

  Scenario: SEO 및 메타데이터 확인
    When 검색엔진 크롤러가 사이트를 방문한다
    Then 적절한 meta title과 description이 설정되어 있다
    And Open Graph 태그가 소셜 미디어용으로 설정되어 있다
    And robots.txt와 sitemap.xml이 존재한다
    And 구조화된 데이터(Schema.org)가 적용되어 있다
```

---

이 문서는 VRidge 웹서비스의 완전한 사용자 여정을 포괄하며, 실제 배포 환경에서 E2E 테스트가 가능하도록 구체적인 UI 요소와 기대 동작을 명시했습니다. 각 시나리오는 독립적으로 실행 가능하며, 비즈니스 가치에 따라 우선순위가 지정되어 있어 효율적인 QA 프로세스를 지원합니다.