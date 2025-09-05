/**
 * widgets Public API
 * FSD 경계: 조합된 UI 블록과 독립적인 위젯의 Public 인터페이스
 * 여러 features를 조합하여 완전한 UI 위젯을 구성
 */

// Header 위젯
export {
  Header,
  type HeaderItem
} from './Header'

// 향후 추가될 위젯들을 위한 Public API 준비:
// export { VideoPlayer } from './VideoPlayer'
// export { ProjectDashboard } from './ProjectDashboard'
// export { UserProfile } from './UserProfile'
// export { NavigationSidebar } from './NavigationSidebar'

// 위젯 관련 공통 타입들
// export type {
//   WidgetProps,
//   WidgetSize,
//   WidgetTheme
// } from './types'