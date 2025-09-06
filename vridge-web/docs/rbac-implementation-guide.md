# RBAC 권한 시스템 구현 가이드

## 개요

본 프로젝트에서 구현된 역할 기반 접근 제어(RBAC) 시스템은 DEVPLAN.md 요구사항에 따라 계층적 권한 구조를 제공하며, 다음 기능을 포함합니다:

- **역할별 권한 관리** (Admin, Manager, Editor, Viewer)
- **프로젝트별 세부 권한 제어**
- **API 레벨 권한 검증**
- **프론트엔드 조건부 렌더링**
- **감사 로그 시스템**
- **성능 최적화를 위한 권한 캐싱**

## 아키텍처 구성

```
entities/rbac/          # 권한 관련 도메인 로직
├── model/
│   └── types.ts       # 권한 타입 정의
└── lib/
    └── permissionChecker.ts  # 권한 검사 로직

features/rbac/         # 권한 관련 기능
├── ui/
│   ├── PermissionGuard.tsx
│   └── RoleBasedContent.tsx
└── model/
    └── useUserPermissions.ts

shared/lib/permissions/  # 공통 권한 유틸리티
├── middleware.ts      # API 권한 미들웨어
├── cache.ts          # 권한 캐싱 시스템
└── route-guard.tsx   # 라우트 보호

entities/audit/        # 감사 로그
└── model/
    └── auditService.ts
```

## 권한 시스템 사용법

### 1. 역할별 권한 구조

```typescript
// 역할 정의 (계층적 구조)
enum UserRole {
  ADMIN = 'admin',      // 모든 권한
  MANAGER = 'manager',  // 프로젝트 관리, 팀원 초대
  EDITOR = 'editor',    // 콘텐츠 편집, 피드백 작성
  VIEWER = 'viewer'     // 조회만 가능
}

// 권한 정의 (CRUD + 특수 권한)
enum Permission {
  // 프로젝트 권한
  PROJECT_CREATE = 'project:create',
  PROJECT_READ = 'project:read',
  PROJECT_UPDATE = 'project:update',
  PROJECT_DELETE = 'project:delete',
  
  // 팀 관리 권한
  TEAM_INVITE = 'team:invite',
  TEAM_REMOVE = 'team:remove',
  
  // 시스템 관리 권한 (Admin 전용)
  SYSTEM_ADMIN = 'system:admin',
  USER_MANAGE = 'user:manage',
  
  // ... 기타 권한
}
```

### 2. API 레벨 권한 검증

#### 기본 사용법

```typescript
// app/api/projects/route.ts
import { PermissionPresets } from '@/shared/lib/permissions/middleware'

// 프로젝트 조회 권한 적용
export const GET = PermissionPresets.projectRead()(
  withErrorHandler(async (request: NextRequest) => {
    // 권한이 확인된 사용자만 이 코드에 도달
    // 비즈니스 로직 구현
  })
)

// 프로젝트 생성 권한 적용
export const POST = PermissionPresets.projectCreate()(
  withErrorHandler(async (request: NextRequest) => {
    // Manager 이상만 접근 가능
  })
)
```

#### 커스텀 권한 검증

```typescript
import { withPermissionCheck, Permission } from '@/shared/lib/permissions/middleware'

export const DELETE = withPermissionCheck({
  permissions: [Permission.PROJECT_DELETE],
  extractProjectId: extractProjectIdFromUrl,
  redirectTo: '/unauthorized'
})(withErrorHandler(async (request: NextRequest) => {
  // Admin만 접근 가능한 삭제 로직
}))
```

#### 복합 권한 검증

```typescript
export const PUT = withPermissionCheck({
  permissions: [Permission.PROJECT_UPDATE, Permission.TEAM_UPDATE],
  requireAll: false, // 둘 중 하나만 있으면 허용
  enableAuditLog: true
})(withErrorHandler(async (request: NextRequest) => {
  // 프로젝트 수정 또는 팀 관리 권한이 있는 사용자
}))
```

### 3. 프론트엔드 권한 기반 렌더링

#### PermissionGuard 사용

```tsx
import { PermissionGuard } from '@/features/rbac/ui/PermissionGuard'
import { Permission } from '@/entities/rbac/model/types'

function ProjectActions() {
  return (
    <div>
      {/* 프로젝트 수정 권한이 있는 사용자에게만 표시 */}
      <PermissionGuard permission={Permission.PROJECT_UPDATE}>
        <button>프로젝트 수정</button>
      </PermissionGuard>
      
      {/* 프로젝트 삭제 권한이 있는 사용자에게만 표시 */}
      <PermissionGuard 
        permission={Permission.PROJECT_DELETE}
        fallback={<div>권한이 없습니다</div>}
      >
        <button className="text-red-500">프로젝트 삭제</button>
      </PermissionGuard>
      
      {/* 다중 권한 검사 */}
      <PermissionGuard 
        permissions={[Permission.TEAM_INVITE, Permission.TEAM_UPDATE]}
        requireAll={false}
      >
        <button>팀 관리</button>
      </PermissionGuard>
    </div>
  )
}
```

#### RoleBasedContent 사용

```tsx
import { 
  AdminOnlyContent, 
  ManagerOnlyContent, 
  RoleSwitch 
} from '@/features/rbac/ui/RoleBasedContent'

function Dashboard() {
  return (
    <div>
      {/* 관리자 전용 컨텐츠 */}
      <AdminOnlyContent>
        <div className="bg-red-100 p-4">
          <h2>시스템 관리</h2>
          <SystemAdminPanel />
        </div>
      </AdminOnlyContent>
      
      {/* 매니저 이상 접근 가능 */}
      <ManagerOnlyContent includeSubRoles={true}>
        <ProjectManagementPanel />
      </ManagerOnlyContent>
      
      {/* 역할별 다른 컨텐츠 표시 */}
      <RoleSwitch
        adminContent={<AdminDashboard />}
        managerContent={<ManagerDashboard />}
        editorContent={<EditorDashboard />}
        viewerContent={<ViewerDashboard />}
      />
    </div>
  )
}
```

### 4. 라우트 보호

#### 자동 라우트 가드

```tsx
// app/layout.tsx
import { AutoRouteGuard } from '@/shared/lib/permissions/route-guard'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AutoRouteGuard>
          {children}
        </AutoRouteGuard>
      </body>
    </html>
  )
}
```

#### HOC를 사용한 페이지 보호

```tsx
// app/admin/page.tsx
import { withRole } from '@/shared/lib/permissions/route-guard'
import { UserRole } from '@/entities/rbac/model/types'

function AdminPage() {
  return <div>관리자 페이지</div>
}

export default withRole(AdminPage, [UserRole.ADMIN], {
  redirectTo: '/dashboard'
})
```

#### 커스텀 라우트 가드

```tsx
import { RouteGuard } from '@/shared/lib/permissions/route-guard'

function ProjectDetailPage({ params }: { params: { id: string } }) {
  return (
    <RouteGuard 
      config={{
        permissions: [Permission.PROJECT_READ],
        extractProjectContext: () => ({ projectId: params.id })
      }}
    >
      <ProjectDetails projectId={params.id} />
    </RouteGuard>
  )
}
```

### 5. 프로젝트별 권한 제어

```typescript
// 사용자별 프로젝트 권한 설정
const userWithProjectPermissions: RBACUser = {
  id: 'user-123',
  role: UserRole.VIEWER, // 기본적으로 뷰어 권한
  projectPermissions: {
    'project-456': [
      Permission.PROJECT_UPDATE,
      Permission.VIDEO_UPLOAD
    ] // 특정 프로젝트에서는 편집 권한
  }
}

// 권한 검사 시 프로젝트 컨텍스트 제공
const result = PermissionChecker.hasPermission(
  userWithProjectPermissions,
  Permission.PROJECT_UPDATE,
  { projectId: 'project-456' }
)
// result.allowed === true (프로젝트별 권한으로 허용)
```

### 6. 권한 캐싱 및 성능 최적화

```typescript
import { 
  CachedPermissionChecker, 
  warmupPermissionCache 
} from '@/shared/lib/permissions/cache'

// 캐시된 권한 검사 (성능 최적화)
const hasPermission = await CachedPermissionChecker.hasPermissionCached(
  user,
  Permission.PROJECT_CREATE
)

// 자주 사용되는 사용자들의 권한 캐시 워밍업
await warmupPermissionCache([adminUser, managerUser])

// 사용자 역할 변경 시 캐시 무효화
CachedPermissionChecker.invalidateUserRole(userId, newRole)
```

### 7. 감사 로그 시스템

```typescript
import { AuditService, AuditEventType } from '@/entities/audit/model/auditService'

// 권한 검사 로그
await AuditService.logPermissionCheck(
  userId,
  userName,
  Permission.PROJECT_DELETE,
  'denied',
  '/api/projects/123',
  { ipAddress: '192.168.1.1' }
)

// 역할 변경 로그
await AuditService.logRoleChange(
  adminId,
  adminName,
  targetUserId,
  targetUserName,
  'editor',
  'manager'
)

// 보안 위험 감지
const risks = await AuditService.detectSecurityRisks(60) // 최근 60분
risks.forEach(risk => {
  if (risk.severity === 'critical') {
    // 보안 알림 발송
  }
})

// 사용자 활동 요약
const summary = await AuditService.getUserActivitySummary(userId, 30)
console.log(`총 ${summary.totalActions}개 활동, ${summary.deniedPermissions}개 권한 거부`)
```

## 권한 설정 예제

### 1. 새로운 권한 추가

```typescript
// 1. entities/rbac/model/types.ts에 권한 추가
export enum Permission {
  // ... 기존 권한들
  ANALYTICS_EXPORT = 'analytics:export',  // 새 권한 추가
}

// 2. 역할별 기본 권한에 추가
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // ... 기존 권한들
    Permission.ANALYTICS_EXPORT,  // Admin에게 권한 부여
  ],
  // ... 다른 역할들
}
```

### 2. 새로운 API 엔드포인트 보호

```typescript
// app/api/analytics/export/route.ts
import { withPermissionCheck, Permission } from '@/shared/lib/permissions/middleware'

export const POST = withPermissionCheck({
  permissions: [Permission.ANALYTICS_EXPORT],
  enableAuditLog: true,
  customErrorResponse: (result) => NextResponse.json({
    error: '분석 데이터 내보내기 권한이 필요합니다.',
    requiredPermissions: result.missingPermissions
  }, { status: 403 })
})(withErrorHandler(async (request: NextRequest) => {
  // 분석 데이터 내보내기 로직
}))
```

### 3. 복잡한 권한 로직

```typescript
// 조건부 권한 검사
const canDeleteProject = (user: RBACUser, projectId: string): boolean => {
  // 기본 삭제 권한 확인
  const hasDeletePermission = PermissionChecker.hasPermission(
    user, 
    Permission.PROJECT_DELETE
  ).allowed

  // 프로젝트 소유자 확인
  const isProjectOwner = checkProjectOwnership(user.id, projectId)

  // Admin이거나 프로젝트 소유자인 경우 허용
  return hasDeletePermission || (isProjectOwner && user.role === UserRole.MANAGER)
}
```

## 테스트 전략

### 1. 권한 시스템 테스트

```typescript
// TDD 방식으로 작성된 테스트 예제
describe('RBAC Permission System', () => {
  test('Manager는 프로젝트 생성 권한을 가져야 함', () => {
    const manager = createTestUser(UserRole.MANAGER)
    const result = PermissionChecker.hasPermission(manager, Permission.PROJECT_CREATE)
    expect(result.allowed).toBe(true)
  })

  test('Viewer는 프로젝트 삭제 권한이 없어야 함', () => {
    const viewer = createTestUser(UserRole.VIEWER)
    const result = PermissionChecker.hasPermission(viewer, Permission.PROJECT_DELETE)
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('권한이 없습니다')
  })
})
```

### 2. API 권한 테스트

```typescript
describe('API Permission Middleware', () => {
  test('권한 없는 사용자의 API 접근을 차단해야 함', async () => {
    const response = await fetch('/api/projects', {
      headers: { 'Authorization': 'Bearer viewer-token' }
    })
    expect(response.status).toBe(403)
  })
})
```

## 모니터링 및 디버깅

### 1. 권한 캐시 상태 확인

```typescript
import { getPermissionCacheHealth } from '@/shared/lib/permissions/cache'

const cacheHealth = getPermissionCacheHealth()
console.log('캐시 상태:', cacheHealth.status)
console.log('캐시 히트율:', cacheHealth.cacheHitRate)
```

### 2. 감사 로그 분석

```typescript
// 최근 권한 거부 이벤트 조회
const deniedEvents = await AuditService.getAuditLogs({
  result: ['denied'],
  dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000), // 최근 24시간
  limit: 100
})

// 보안 위험 알림
const risks = await AuditService.detectSecurityRisks()
if (risks.length > 0) {
  console.warn('보안 위험 감지:', risks)
}
```

## 주의사항 및 베스트 프랙티스

### 1. 보안 고려사항

- **클라이언트 사이드 검증은 UX용**: 실제 보안은 서버에서 처리
- **세션 만료 처리**: 권한 캐시와 세션 상태 동기화 필요
- **권한 에스컬레이션 방지**: 사용자가 자신의 권한을 임의로 수정할 수 없도록 설계

### 2. 성능 최적화

- **권한 캐시 활용**: 자주 확인하는 권한은 캐시 사용
- **불필요한 권한 검사 최소화**: 컴포넌트 레벨에서 중복 검사 방지
- **비동기 권한 로딩**: 초기 로딩 시간 최적화

### 3. 유지보수성

- **권한 변경 시 영향도 분석**: 새로운 권한 추가 시 기존 기능에 미치는 영향 검토
- **테스트 커버리지 유지**: 권한 관련 로직은 높은 테스트 커버리지 필요
- **감사 로그 정기 분석**: 보안 이벤트 및 사용 패턴 모니터링

### 4. 사용자 경험

- **명확한 권한 부족 메시지**: 사용자가 왜 접근할 수 없는지 이해할 수 있도록
- **적절한 대체 UI**: 권한이 없는 기능에 대한 대체 인터페이스 제공
- **로딩 상태 처리**: 권한 확인 중 적절한 로딩 인디케이터 표시

## 문제 해결

### 1. 권한이 제대로 적용되지 않는 경우

```typescript
// 디버깅용 권한 검사
const debugPermission = (user: RBACUser, permission: Permission) => {
  console.log('사용자:', user.email, '역할:', user.role)
  console.log('요청 권한:', permission)
  
  const result = PermissionChecker.hasPermission(user, permission)
  console.log('검사 결과:', result)
  
  const userPermissions = PermissionChecker.getValidPermissions(user)
  console.log('사용자 보유 권한:', userPermissions)
  
  return result
}
```

### 2. 캐시 관련 문제

```typescript
// 캐시 초기화 (개발 환경에서만)
if (process.env.NODE_ENV === 'development') {
  import('@/shared/lib/permissions/cache').then(({ permissionCache }) => {
    permissionCache.clear()
    console.log('권한 캐시가 초기화되었습니다.')
  })
}
```

### 3. 감사 로그 확인

```typescript
// 특정 사용자의 최근 활동 확인
const recentActivity = await AuditService.getAuditLogs({
  userId: 'problematic-user-id',
  dateFrom: new Date(Date.now() - 60 * 60 * 1000), // 최근 1시간
})
console.table(recentActivity)
```

이 가이드를 참고하여 RBAC 권한 시스템을 효과적으로 활용하시기 바랍니다. 추가 질문이나 문제가 있으시면 개발팀에 문의해 주세요.