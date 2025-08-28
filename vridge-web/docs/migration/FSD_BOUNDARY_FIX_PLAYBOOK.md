# FSD 경계 위반 수정 플레이북

## 🚨 긴급도: P0 (최우선)

VRidge 웹서비스의 **99개 파일**에서 FSD 아키텍처 경계 위반이 발견되었습니다. 이 문서는 체계적인 수정 방안을 제시합니다.

## 📋 현황 분석

### 주요 위반 패턴
1. **상대경로 Import**: `../../../entities/menu` 형태의 import
2. **Public API 우회**: `index.ts`를 거치지 않는 직접 import
3. **레이어 경계 위반**: 하위 레이어에서 상위 레이어 참조

### 핵심 위반 파일들
- `widgets/SideBar/ui/SideBar.tsx` ✅ 수정 완료 (FSD 준수 버전 생성)
- `shared/ui/SubMenu/SubMenu.tsx` - 부분적 준수 
- `entities/menu/api/menuApi.ts`
- `features/navigation/ui/NavigationProvider.tsx`

## 🛠️ 수정 방법론 - TDD 기반

### Phase 1: Public API 강화
```bash
# 1. entities Public API 검증
cat entities/menu/index.ts
cat entities/user/index.ts

# 2. features Public API 검증  
cat features/navigation/index.ts
cat features/auth/index.ts

# 3. shared Public API 검증
cat shared/ui/index.ts
```

### Phase 2: 핵심 파일 수정 (TDD)

#### 예시: SideBar 위젯 수정

**Step 1: Red Test**
```typescript
// widgets/SideBar/ui/SideBar.fsd-compliant.test.tsx
import { SideBar } from './SideBar.fsd-compliant'

describe('SideBar - FSD Compliance', () => {
  it('uses only Public APIs', () => {
    render(<SideBar />)
    expect(screen.getByRole('complementary')).toBeInTheDocument()
  })
})
```

**Step 2: Green Implementation**
```typescript
// FSD 준수: Public API만 사용
import { menuApi, createMenuItem } from '@/entities/menu'
import { useNavigation, NavigationProvider } from '@/features/navigation' 
import { SubMenu } from '@/shared/ui'

// ❌ 금지: import { menuApi } from '../../../entities/menu/api/menuApi'
```

**Step 3: Refactor**
- 기존 파일을 FSD 준수 버전으로 대체
- 테스트 통과 확인

### Phase 3: 자동 검증 설정

#### ESLint 경계 규칙 활성화
```bash
# .eslintrc.fsd-boundaries.js 활성화
cp .eslintrc.js .eslintrc.js.backup
cp .eslintrc.fsd-boundaries.js .eslintrc.js

# 위반 사항 검사
npm run lint
```

#### Pre-commit Hook 설정
```bash
# 커밋 전 FSD 경계 검증
npm install --save-dev husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npm run lint-staged"
```

## 🎯 즉시 수정이 필요한 파일 목록

### 우선순위 P0 (긴급)
1. `widgets/SideBar/ui/SideBar.tsx` ✅ 완료
2. `shared/ui/MenuButton/MenuButton.tsx`
3. `features/navigation/ui/NavigationProvider.tsx`

### 우선순위 P1 (높음)
1. `entities/menu/api/menuApi.ts`
2. `widgets/Dashboard/ui/DashboardWidget.tsx`
3. `widgets/Calendar/ui/CalendarWidget.tsx`

### 우선순위 P2 (중간)
- 나머지 85개 파일 일괄 수정

## 🔧 수정 템플릿

### Bad (FSD 위반)
```typescript
// ❌ 상대경로 import
import { menuApi } from '../../../entities/menu/api/menuApi'
import { NavigationProvider } from '../../../features/navigation/ui/NavigationProvider'

// ❌ 내부 파일 직접 import
import { validateMenuItem } from '../../entities/menu/model/validation'
```

### Good (FSD 준수)
```typescript
// ✅ Public API 사용
import { menuApi, validateMenuItem } from '@/entities/menu'
import { NavigationProvider } from '@/features/navigation'
```

## 📊 성공 지표

### 완료 기준
- [ ] ESLint 경계 규칙 0개 위반
- [ ] 모든 테스트 통과
- [ ] CI/CD 빌드 성공
- [ ] 성능 회귀 없음

### 모니터링 지표
- 상대경로 import 개수: 99개 → 0개
- Public API 사용률: 30% → 100%
- 순환 의존성: 검사 필요 → 0개

## 🚀 마이그레이션 실행 계획

### Week 1: 핵심 위젯 수정
- SideBar, Dashboard, Navigation 시스템
- 테스트 케이스 작성 및 검증

### Week 2: 일괄 수정 도구
- AST 기반 자동 수정 스크립트 개발
- 나머지 파일들 일괄 변경

### Week 3: 검증 및 배포
- 전체 테스트 스위트 실행
- 성능 테스트 및 사용자 검증
- 프로덕션 배포

## 🔒 롤백 계획

### 긴급 롤백 시나리오
```bash
# 기존 파일 복원
git checkout HEAD~1 -- widgets/SideBar/ui/SideBar.tsx
git checkout HEAD~1 -- .eslintrc.js

# 빠른 배포
npm run build && npm run deploy
```

### 부분 롤백
개별 파일 단위로 문제가 있을 경우 해당 파일만 이전 버전으로 복원

---

**담당자**: Arthur (Chief Architect)  
**검토자**: 개발팀 Lead들  
**타겟 완료일**: 2025-09-04 (1주일 내)