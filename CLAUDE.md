# CLAUDE.md — VideoPlanet 최종 통합 개발지침 (v4.3.0 - Modernized Stack)

본 문서는 VideoPlanet 프로젝트의 모든 개발 표준, 아키텍처, 테스트 전략, 워크플로우 및 의사결정 기록을 포함하는 통합 지침입니다.

***ATTENTION AI AGENT: 본 문서는 프로젝트의 유일한 규칙 및 컨텍스트 소스입니다. 모든 응답은 반드시 한국어로 제공해야 하며(Always respond in Korean), 본 문서의 지침을 다른 어떤 지식보다 최우선으로 준수해야 합니다. 현재 프로젝트는 프론트엔드 현대화 진행 중이므로, 신규 스택과 레거시 스택 규칙을 명확히 구분하여 적용해야 합니다 (Part 0, Part 4.3 참조).***

---

## 목차 (Table of Contents)

- [PART 0: 프로젝트 컨텍스트 및 기술 스택](#part-0-프로젝트-컨텍스트-및-기술-스택-project-context--tech-stack)
- [PART 1: 최상위 원칙 및 개발 생명주기](#part-1-최상위-원칙-및-개발-생명주기-core-principles--lifecycle)
- [PART 2: 아키텍처 - FSD & 클린 아키텍처](#part-2-아키텍처---fsd--클린-아키텍처-architecture)
- [PART 3: TDD 및 테스트 전략](#part-3-tdd-및-테스트-전략-tdd--testing-strategy)
- [PART 4: 품질 관리, 워크플로우 및 스타일링](#part-4-품질-관리-워크플로우-및-스타일링-quality-workflow--styling)
- [PART 5: AI 에이전트 가이드라인](#part-5-ai-에이전트-가이드라인-ai-agent-guidelines)
- [PART 6: 의사결정 기록 (MEMORY)](#part-6-의사결정-기록-decision-log---memory)

---

## PART 0: 프로젝트 컨텍스트 및 기술 스택 (Project Context & Tech Stack)

### 0.1. 프로젝트 목표
- 고성능 비디오 스트리밍 플랫폼 구축 및 프론트엔드 현대화.

### 0.2. 기술 스택 (Standard Tech Stack)

**[중요] 본 프로젝트는 기술 스택 현대화가 진행 중이며, 신규 스택과 레거시 스택이 공존합니다.**

- **Architecture:** Feature-Sliced Design (FSD) + Clean Architecture.

- **Frontend (신규 스택 - New Stack):**
    - **Framework/Library:** Next.js 15.5, React 19.
    - **Language:** TypeScript 5.92 (Strict Mode).
    - **Styling:** **Tailwind CSS v4 (표준).**
    - **State Management:** Redux Toolkit 2.0.

- **Frontend (레거시 스택 - Legacy Stack):**
    - **Framework/Library:** React 18.
    - **Styling:** Sass (SCSS Modules), Ant Design. (Styled Components는 사용 중단).
    - **State Management:** Redux Toolkit.

- **Backend:**
    - Django 4.2, DRF, Channels, PostgreSQL, Redis.

- **API/Validation:** Axios, WebSocket, **Zod (런타임 검증 표준)**.

- **Testing:**
    - Runner: Jest.
    - Component: React Testing Library (RTL).
    - Mocking: **MSW (Mock Service Worker 표준)**.
    - E2E: Cypress.
    - Accessibility: Axe-core (jest-axe, cypress-axe).

- **Tools:** SWC/Turbopack, ESLint, Prettier (Tailwind Plugin 포함), Stylelint (레거시용), Commitlint.
- **Package Manager:** **PNPM 사용 강제.** (npm, yarn 사용 금지).
- **Deployment:** Vercel (Frontend), Railway (Backend).

---

## PART 1: 최상위 원칙 및 개발 생명주기 (Core Principles & Lifecycle)

### 1.1. 핵심 원칙
- **Plan → Do → See:** 모든 작업에 계획, 실행, 피드백의 선순환 구조를 적용합니다.
- **MECE 분석:** 분석 단계에서는 중복과 누락 없이 수행합니다.
- **TDD (Test-Driven Development):** 품질과 예측 가능성 확보를 위해 TDD를 기본 원칙으로 합니다 (Part 3 참조).
- **MEMORY (불변성):** 의사결정 기록(Part 6)은 수정/삭제가 금지된 불변의 로그입니다.
- **단순한 코드 구조로 개발:** 누구나 코드를 열어 수정할 수 있을 정도의 코드 단순성 유지
- **마이그레이션 전략 (Strangler Fig Pattern) (신규):** 프론트엔드 현대화를 위해 스트랭글러 패턴을 적용합니다.
    - 모든 신규 기능은 **신규 스택(React 19, Tailwind CSS)**으로 개발합니다.
    - 기존 기능 수정 시, 가능한 한 신규 스택으로 마이그레이션하는 것을 우선 고려합니다.
    - 레거시 스택과의 경계를 명확히 하고 스타일링 방식(Tailwind vs Sass) 혼용을 엄격히 금지합니다.
- **통합 개발 (중복 금지 절차 강화):** 기존 자산 재사용을 최우선으로 합니다. 새 파일 생성 시 다음 절차를 **반드시** 따릅니다.
    1. **검색:** Glob/Grep을 사용하여 관련 파일 패턴 및 유사 클래스/함수명 검색.
    2. **판단:** 기존 파일 수정으로 해결 가능한지 재사용성 판단.
    3. **검증:** 수정/생성된 파일의 Import 체인 무결성 검증.
    4. **기록 (5 Whys):** 새 파일을 생성해야 할 경우, 그 이유를 5 Whys 방식으로 분석하여 PR에 명시적으로 기록.

### 1.2. 작업 흐름 (Workflow)
1.  **(Alpha) 착수 — 컨텍스트 로드:**
    - DoR 확정 및 의사결정 기록(Part 6) 스캔.
2.  **실행 — 병렬 진행 (TDD & FSD):**
    - **TDD 선행 개발** 수행 (Part 3 참조).
    - 아키텍처 경계(FSD) 준수 (Part 2 참조).
    - 신규/레거시 스택 적용 기준 확인 (Part 4.3 참조).
    - *[AI 실행 방안]:* 실패 테스트 코드부터 제시. 신규 기능은 반드시 신규 스택 사용.
3.  **(Omega) 종료 — 컨텍스트 기록:**
    - 품질 게이트(Part 4) 통과 확인.
    - 커밋 직전, 의사결정 기록(Part 6)에 결과 추가.

---

## PART 2: 아키텍처 - FSD & 클린 아키텍처 (Architecture)

(FSD 아키텍처의 기본 구조와 원칙은 기술 스택 변경과 무관하게 유지됩니다.)

### 2.1. 목표 및 핵심 원칙
**핵심 원칙 (TL;DR):** 레이어 단방향 의존, Public API (index.ts)만 Import, 도메인 순수성 (`entities`), 자동화된 강제(ESLint).

### 2.2. 아키텍처 구조: 레이어 (Layers)

#### 레이어 구조 (단방향 의존성 흐름)
app → processes → pages → widgets → features → entities → shared


(레이어별 역할 및 책임은 PART 2.2의 이전 버전을 참조하십시오.)

### 2.4. 의존성 및 임포트 규칙 (Dependency Control)

#### 절대 규칙
1.  **하위 → 상위 Import 금지.**
2.  **동일 레벨 슬라이스 간 직접 Import 금지.**
3.  **내부 파일 직접 Import 금지. 항상 Public API(`index.ts`) 경유.**

### 2.6. 데이터 흐름 및 상태 관리
- **전역 도메인 상태:** `entities` 레이어에 배치 (Redux Toolkit 2.0).
- **DTO → 도메인 모델 변환:** 서버 DTO는 전용 변환 레이어에서 **Zod**를 사용해 런타임 스키마 검증 후 변환.

### 2.7. 아키텍처 경계 자동 강제 (ESLint Enforcement)
(ESLint 설정 예시는 PART 2.7의 이전 버전을 참조하십시오.)

---

## PART 3: TDD 및 테스트 전략 (TDD & Testing Strategy)

(TDD 원칙과 전략은 기술 스택 변경과 무관하게 유지됩니다.)

### 3.1. 원칙 및 정책
**핵심 원칙:** Red → Green → Refactor, 의존성 절단(MSW, Zod), 결정론성(플래키 불허), 테스트가 명세.

### 3.3. 테스트 피라미드 및 환경 설정 (FSD 연계)
- **단위 (Unit):** 대상: `entities`, `shared/lib`. 환경: **`node`**.
- **컴포넌트/통합:** 대상: `features`, `widgets`, `pages`. 환경: **`jsdom`**.
- **E2E:** 전체 시스템. 환경: Cypress.

### 3.7. 품질 목표 및 플래키 제로 정책
#### 커버리지 목표
- **핵심 도메인 (entities): 90% 이상.**
- 전체 프로젝트: 70% 이상.

---

## PART 4: 품질 관리, 워크플로우 및 스타일링 (Quality, Workflow & Styling)

### 4.1. 품질 게이트 & CI (Quality Gates & CI)

모든 PR은 다음 게이트를 통과해야 하며, 위반 시 병합이 차단됩니다.

- **타입 안정성:** `tsc --noEmit` 통과 (TS 5.7 기준).
- **코드 품질/경계:**
    - ESLint (FSD 경계, React 19 규칙 포함) 통과.
    - **Prettier (Tailwind Plugin 포함):** 코드 포맷팅 및 Tailwind 클래스 순서 자동 정렬 준수.
    - **Stylelint 통과 (레거시 코드 한정):** Sass 규칙 위반 시 실패 처리.
- **테스트:** Jest, Cypress 스모크 통과.
- **순환 의존성 제로.**
- **성능 예산:** 정의된 성능 예산(Part 4.4) 기준치 회귀 발생 시 CI 실패 처리.
- **보안 검사 (SAST).**
- **접근성 검사 (A11y):** `axe-core`를 통한 자동화된 접근성 검사 통과.
- **커밋 메시지 검사:** Commit Hook (`commitlint`)을 통한 Conventional Commits 형식 검사.

### 4.2. Git 및 버전 관리 전략 (Git & Versioning)

(브랜치 전략, 커밋 메시지 규칙, PR 규칙, 시맨틱 버전 관리는 PART 4.2의 이전 버전을 참조하십시오.)

### 4.3. 스타일링 및 CSS 아키텍처 (Styling & CSS Architecture) (전면 개정)

**[중요] 프론트엔드 현대화에 따라 스타일링 아키텍처가 변경되었습니다.**

#### 4.3.1. 기본 원칙 및 우선순위
1. **Tailwind CSS v4 (신규 코드 표준):** 모든 신규 개발 및 마이그레이션 코드는 Tailwind CSS를 사용합니다. (Utility-First 접근 방식)
2. **디자인 토큰 우선 (Tailwind Config):** 색상, 간격 등은 `tailwind.config.js`에 정의된 디자인 토큰을 사용합니다.
3. **Sass/SCSS Modules (레거시):** 기존 레거시 코드 유지보수에만 사용하며, 신규 도입을 금지합니다.
4. **Styled Components (사용 중단):** 더 이상 사용하지 않으며, 발견 시 Tailwind CSS로 전환합니다.

#### 4.3.2. 디자인 가이드라인
- **이모지 사용 금지.**
- **대표 색상 활용:** Tailwind 설정에 정의된 색상 토큰 사용 (예: `text-primary`, `bg-danger`).

#### 4.3.3. Tailwind CSS 사용 규칙 (신규)
- **임의 값(Arbitrary values) 금지:** `w-[123px]`와 같은 임의 값 사용을 엄격히 금지합니다. 반드시 `tailwind.config.js`에 정의된 토큰(예: `w-8`)을 사용해야 합니다 (ESLint 강제).
- **클래스 순서 정렬:** `prettier-plugin-tailwindcss`를 사용하여 클래스 순서를 자동으로 정렬합니다.
- **복잡한 스타일 처리:** 복잡한 스타일 조합은 컴포넌트 내부에서 처리하며, `@apply` 사용은 엄격히 금지합니다.
- **조건부 스타일링:** `clsx` 또는 `cva`(Class Variance Authority)를 사용하여 조건부 스타일링을 관리합니다.

#### 4.3.4. 레거시 스타일(Sass) 관리 규칙
레거시 코드 유지보수 시에만 적용됩니다.

- **!important 금지** (Stylelint 강제).
- **전역 스타일 금지.**
- **중복 파일 금지:** (Part 1.1의 중복 방지 절차 참조). **새로운 SCSS 파일 생성 절대 금지.**

#### 4.3.5. 마이그레이션 전략
- **격리:** 레거시 CSS(Sass)가 신규 Tailwind 스타일에 영향을 주지 않도록 범위를 격리합니다.
- **점진적 전환:** 페이지 또는 위젯 단위로 점진적으로 Tailwind CSS로 전환합니다.

#### 4.3.6. 리팩토링 트리거 (Refactoring Triggers)
다음 조건 충족 시 리팩토링(특히 레거시 스타일 코드의 마이그레이션)을 즉시 검토합니다.

- **파일 수:** 동일 기능 관련 레거시 파일이 **3개 이상** 존재할 경우.
- **하드코딩 (레거시):** 레거시 Sass 파일 내 하드코딩된 값이 **10개 이상** 발견될 경우.
- **!important (레거시):** 레거시 Sass 파일 내 `!important` 사용이 **5개 이상** 발견될 경우.
- **Styled Components 사용:** Styled Components가 발견될 경우.

### 4.4. 보안, 성능 및 안정성 (Security, Performance & Stability)

#### 4.4.1. 성능 예산 (Performance Budget)
(React 19 및 Next.js 15.5 최적화 반영)
- **LCP:** 2.5초 이내.
- **INP:** 200ms 이내.
- **CLS:** 0.1 이하.

#### 4.4.2. 보안 및 설정 관리
- **환경 변수 검증:** 애플리케이션 시작 시점에 **Zod 스키마**를 사용하여 모든 환경 변수의 유효성을 검사합니다. 실패 시 빌드/실행이 중단됩니다.

#### 4.4.3. 에러 핸들링 및 로깅 표준
(PII 로깅 금지 등 표준 체크리스트는 PART 4.4.3의 이전 버전을 참조하십시오.)

---

## PART 5: AI 에이전트 가이드라인 (AI Agent Guidelines)

### 5.1. 개발자 상호작용 원칙
- **스택 명시 (중요):** AI에게 작업을 요청할 때 신규 스택(Tailwind)인지 레거시 스택(Sass)인지 명확히 지시해야 합니다.
- **TDD 우선, 범위 제어, 검증 의무.** (AI를 맹신하지 않음).

### 5.3. AI 절대 금지 사항 (Strictly Prohibited Guardrails) (업데이트)
AI는 다음 행위를 절대 수행해서는 안 됩니다.

- **TypeScript:** `any`, `@ts-ignore`, `@ts-nocheck` 사용.
- **Styling (중요 변경):**
    - 신규 코드에 Sass/SCSS Modules 또는 Styled Components 사용. (**Tailwind CSS만 사용**).
    - **새로운 SCSS 파일 생성 (절대 금지).**
    - Tailwind CSS에서 임의 값(Arbitrary values) 사용.
    - `@apply` 사용.
    - 이모지 사용.
- **Code Duplication:** 기존 파일 검색(Glob/Grep) 없이 새 파일 생성.
- **Architecture (FSD):** FSD 규칙 위반 (상향 의존성, 내부 import 등).
- **Libraries & Patterns:** `moment.js` 사용, 컴포넌트 내 직접 API 호출.
- **Package Manager:** `npm` 또는 `yarn` 사용 (`pnpm`만 사용).

### 5.4. AI 워크플로우 및 완료 조건 (AI Workflow & DoD)

#### 5.4.1. 워크플로우 (TDD 필수)
1.  **Context 이해:** 의사결정 기록(Part 6) 검토.
2.  **스택 식별 (중요):** 작업 대상이 신규 스택인지 레거시 스택인지 확인.
3.  **Red (실패 테스트 작성).**
4.  **Green (최소 구현):** MSW로 API 모킹.
5.  **Refactor.**

#### 5.4.2. Git 커밋 메시지
- Conventional Commits 형식 준수 (Commit Hook으로 자동 검증).
- 모든 커밋 메시지에 다음 서명을 포함해야 합니다:
🤖 Generated with Claude Code
Co-Authored-By: Claude noreply@anthropic.com


#### 5.4.4. 완료 조건 (Definition of Done - DoD)
1.  **스택 준수:** 신규 코드에 올바른 스택(Tailwind CSS) 적용 (Part 4.3).
2.  **FSD 준수** (Part 2).
3.  **TDD 준수** (Part 3).
4.  **품질 게이트 통과** (Part 4.1).
5.  **중복 없음** (Part 1.1).

### 5.5. 마이그레이션 지침 (AI 전용) (신규)
- AI는 작업 대상 파일의 기술 스택(특히 스타일링 방식)을 먼저 분석해야 합니다.
- 파일이 Sass/SCSS Modules를 사용하는 경우 (레거시):
    - 단순 수정 시 기존 스타일 규칙을 유지합니다.
    - 리팩토링 요청 시 Tailwind CSS로의 전환 계획을 제안해야 합니다.
- 파일이 없거나 신규 생성 시 (신규):
    - 반드시 React 19와 Tailwind CSS를 사용합니다.

---

## PART 6: 의사결정 기록 (Decision Log - MEMORY)

**관리 원칙:** 본 섹션은 **불변의 로그(Immutable Log)**입니다. (삭제 금지, 변경 금지, 추가만 허용, 시간 역순 기록).

### 6.1. 프로젝트 구조 정보 (Project Structure)

**(주의: 이 섹션은 프로젝트 구조 변경 시마다 최신화해야 합니다.)**

#### 디렉토리 구조 (FSD)
src/
├── app/
├── processes/
├── pages/
├── widgets/
├── features/
├── entities/
└── shared/
tailwind.config.js # Tailwind 설정 및 디자인 토큰 중앙 관리


### 6.2. 의사결정 히스토리 (Decision History)

#### [2025-08-28] 프론트엔드 기술 스택 현대화 결정 (v4.3.0)

- **요청/배경:** 성능 향상, 개발자 경험(DX) 개선 및 최신 생태계 활용을 위한 프론트엔드 스택 업그레이드 필요.
- **핵심 해결책:**
    - 신규 표준 스택으로 Next.js 15.5, React 19, TypeScript 5.7, Redux Toolkit 2.0 도입.
    - 스타일링 아키텍처를 기존 Sass에서 Tailwind CSS v4로 전면 교체 결정.
    - 점진적 마이그레이션을 위한 스트랭글러 패턴 채택.
- **주요 결정:**
    - 모든 신규 코드는 Tailwind CSS 사용 의무화. Styled Components 사용 중단.
    - Tailwind 사용 시 임의 값(Arbitrary Values) 금지 및 디자인 토큰 중앙 관리 원칙 수립.
    - 레거시 스택(React 18, Sass, Antd)은 유지보수 모드로 전환하며 점진적으로 제거.
- **리스크/영향:** 마이그레이션 기간 동안 두 가지 스타일링 방식 공존으로 인한 복잡성 증가. 팀원의 Tailwind CSS 학습 곡선 발생.

#### [2025-08-28] 개발 표준 강화 및 자동화 도입 (v4.2.0)

- **요청/배경:** 운영 구체성 강화 및 자동화된 품질 강제 방안 도입 필요.
- **핵심 해결책:** 중복 방지 절차 강화, 리팩토링 트리거 수치화, 성능 예산 CI 연동, 자동화 도구 도입, 환경 변수 검증 의무화.

#### [2025-08-28] 개발 표준 문서 통합 및 호환성 개선 (v4.1.0)

- **요청/배경:** 개발 표준을 단일 문서로 통합하고, 마크다운 호환성 개선 요청.
- **핵심 해결책:** 모든 문서를 `CLAUDE.md`로 통합 완료.

#### [2025-08-23] 아키텍처 도입 결정 (FSD + Clean Architecture)

- **요청/배경:** 프로젝트 규모 확장 대비 및 팀 병렬 작업 효율화 필요.
- **핵심 해결책:** Feature-Sliced Design(FSD)과 클린 아키텍처 도입 결정.

<!-- 새로운 기록은 이 위에 추가해 주세요 (시간 역순) -->

---
**문서 버전: 4.3.0 (Modernized Stack)**
**최종 업데이트: 2025-08-28**