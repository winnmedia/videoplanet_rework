# ADR-001: 5-Tier RBAC 시스템과 팀 관리 파이프라인 아키텍처

**상태:** Accepted  
**결정자:** Arthur (Chief Architect)  
**날짜:** 2025-01-03  
**태그:** 보안, 권한관리, 아키텍처, FSD

## 컨텍스트 및 문제점

VLANET 비디오 스트리밍 플랫폼에서 프로젝트별 팀 관리 시스템이 필요하며, 다음과 같은 요구사항이 있습니다:

1. **세분화된 권한 제어**: 프로젝트별로 다양한 역할과 권한이 필요
2. **SendGrid 통합**: 이메일 기반 팀 초대 시스템 구현  
3. **기존 Pipeline 연동**: 사용자 진행 단계와 팀 관리 플로우 통합
4. **레거시 UI 톤앤매너 보존**: 기존 디자인 시스템과 100% 호환
5. **확장 가능한 아키텍처**: Feature-Sliced Design 원칙 준수

## 고려된 대안들

### 1. 3-Tier 단순 권한 시스템
- **장점**: 구현 단순, 빠른 개발
- **단점**: 세분화된 권한 제어 불가, 확장성 제한
- **결정**: 거부 - 비즈니스 요구사항 미충족

### 2. Role-Based Access Control (RBAC) vs Attribute-Based Access Control (ABAC)
- **RBAC 장점**: 구현 단순, 이해 용이, 감사 가능
- **ABAC 장점**: 매우 세분화된 제어 가능
- **결정**: RBAC 선택 - 복잡도와 성능의 균형점

### 3. 권한 체계 설계
- **3-Tier**: Owner, Member, Viewer
- **5-Tier**: Owner, Admin, Editor, Reviewer, Viewer  
- **7-Tier**: 더 세분화된 역할들
- **결정**: 5-Tier 선택 - 충분한 세분화와 관리 복잡도의 균형

## 결정사항

### 1. 5-Tier RBAC 시스템 구조

```typescript
enum ProjectRole {
  OWNER = 'owner',      // 프로젝트 소유자 - 모든 권한
  ADMIN = 'admin',      // 관리자 - 프로젝트 삭제 제외한 모든 권한  
  EDITOR = 'editor',    // 편집자 - 콘텐츠 편집, 파일 업로드/수정
  REVIEWER = 'reviewer', // 검토자 - 콘텐츠 조회, 피드백/댓글 작성
  VIEWER = 'viewer'     // 보기 권한만
}
```

**권한 매트릭스:**
| 작업 | Owner | Admin | Editor | Reviewer | Viewer |
|------|-------|-------|--------|----------|--------|
| 프로젝트 삭제 | ✓ | ✗ | ✗ | ✗ | ✗ |
| 멤버 관리 | ✓ | ✓ | ✗ | ✗ | ✗ |
| 콘텐츠 편집 | ✓ | ✓ | ✓ | ✗ | ✗ |
| 피드백/리뷰 | ✓ | ✓ | ✓ | ✓ | ✗ |
| 콘텐츠 조회 | ✓ | ✓ | ✓ | ✓ | ✓ |

### 2. FSD 아키텍처 적용

**레이어별 책임:**
```
├── entities/team/          # 도메인 엔티티 (TeamMember, TeamInvitation, RBAC 로직)
├── features/team-management/  # 팀 관리 비즈니스 로직 
│   ├── model/             # Redux state, types, validation
│   ├── api/               # Async thunks, optimistic updates  
│   └── ui/                # 팀 관리 컴포넌트들
├── shared/api/team         # API 계약 및 SendGrid 통합
└── processes/userPipeline  # 기존 파이프라인과 연동
```

### 3. SendGrid 통합 설계

**이메일 초대 플로우:**
1. **초대 생성** → SendGrid 템플릿 이메일 발송
2. **웹훅 수신** → 배송 상태 실시간 추적  
3. **수락/거절** → 보안 토큰 기반 인증
4. **만료 처리** → 7일 후 자동 만료

```typescript
interface TeamInvitation {
  // 핵심 필드
  id: string
  email: string
  role: ProjectRole
  
  // SendGrid 통합
  sendGridMessageId?: string
  emailTemplate?: string
  sendGridStatus?: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced'
  
  // 보안
  inviteToken?: string
}
```

### 4. 낙관적 업데이트 전략

**멤버 초대:**
```typescript
// 1. 즉시 UI 반영 (낙관적)
dispatch(inviteMemberOptimistic(tempInvitation))

// 2. API 호출
const realInvitation = await sendInvitation()

// 3-A. 성공시 임시 → 실제 교체
dispatch(inviteMemberSuccess({ tempId, invitation: realInvitation }))

// 3-B. 실패시 롤백 + 에러 표시  
dispatch(inviteMemberFailure({ tempId, error }))
```

### 5. 기존 Pipeline 연동

**데이터 흐름:**
```
UserPipeline (project 단계) 
    ↓ projectId, userRole
TeamManagement (invite 플로우)
    ↓ 초대 완료시
Pipeline (다음 단계로 진행)
```

## 결과

### 긍정적 영향
1. **세분화된 권한 제어**: 5가지 역할로 충분한 권한 세분화
2. **확장성**: FSD 아키텍처로 기능별 독립적 확장 가능
3. **사용자 경험**: 낙관적 업데이트로 즉각적인 반응성
4. **신뢰성**: 이메일 전송 상태 실시간 추적
5. **보안**: 토큰 기반 초대 시스템으로 보안 강화

### 잠재적 위험 및 완화
1. **복잡도 증가** 
   - 완화: 철저한 타입 시스템과 테스트 커버리지
2. **성능 오버헤드**
   - 완화: Redis 캐싱과 데이터베이스 인덱싱
3. **이메일 전송 실패**
   - 완화: 재시도 메커니즘과 대체 알림 수단

## 준수사항

### 1. 아키텍처 경계 강제
```typescript
// ✅ 올바른 import (Public API)
import { ProjectRole } from 'entities/team'

// ❌ 잘못된 import (내부 구현)  
import { ProjectRole } from 'entities/team/model/types'
```

### 2. 권한 검증 의무화
```typescript
// 모든 팀 관리 작업 전에 권한 검증 필수
if (!hasPermission(userRole, 'MANAGE_MEMBERS')) {
  throw new PermissionDeniedError()
}
```

### 3. 에러 처리 표준화
```typescript
// 모든 팀 관리 에러는 TeamManagementError 타입 사용
interface TeamManagementError {
  type: 'INVITATION_FAILED' | 'PERMISSION_DENIED' | '...'
  message: string
  retryable: boolean
}
```

## 참고자료

- [Feature-Sliced Design](https://feature-sliced.design/)
- [Redux Toolkit Best Practices](https://redux-toolkit.js.org/usage/usage-guide)
- [SendGrid API Documentation](https://docs.sendgrid.com/)
- [RBAC vs ABAC Comparison](https://www.okta.com/identity-101/role-based-access-control-vs-attribute-based-access-control/)

## 히스토리

- 2025-01-03: 초기 결정 및 아키텍처 설계 완료
- TBD: 프로덕션 배포 후 성능 메트릭 및 개선사항 추가 예정